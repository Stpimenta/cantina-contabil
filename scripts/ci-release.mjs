import { ReleaseError } from "./release-error.mjs";
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  readdirSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { z } from "zod";
import { prepareDeployment } from "./deploy-build.mjs";
import { deployPrepared } from "./deploy-worker.mjs";
import { requestJson, cloudflareClient, gitRefSchema } from "./ci-api.mjs";
import {
  validatePackageVersion,
  releaseMessage,
  checkMigrationNames,
  deploymentDecision,
} from "./release-rules.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const shaSchema = z.string().regex(/^[a-f0-9]{40}$/);
const prSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  merged_at: z.string().nullable(),
  merge_commit_sha: z.string().nullable(),
  base: z.object({ ref: z.string() }),
});
const configSchema = z.object({
  account_id: z.string().regex(/^[a-f0-9]{32}$/),
  name: z.literal("cantina-contabil"),
  d1_databases: z
    .array(
      z.object({
        binding: z.string(),
        database_id: z.uuid(),
        migrations_dir: z.literal("migrations"),
      }),
    )
    .length(1),
});
function valid(schema, value, label) {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ReleaseError(`${label} inválido; conferir configuração.`);
  return result.data;
}
function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
function summary(value) {
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${value}\n`);
}
export function validateReleaseFiles(event, eventName) {
  const pkg = json(join(root, "package.json"));
  const lock = json(join(root, "package-lock.json"));
  const base =
    eventName === "pull_request"
      ? event.pull_request?.base?.sha
      : eventName === "push"
        ? event.before
        : undefined;
  let previous;
  if (base) {
    valid(shaSchema, base, "Commit base");
    previous = JSON.parse(
      execFileSync("git", ["show", `${base}:package.json`], {
        cwd: root,
        encoding: "utf8",
      }),
    ).version;
  }
  if (base) {
    const changes = execFileSync(
      "git",
      ["diff", "--name-status", base, "HEAD", "--", "migrations"],
      { cwd: root, encoding: "utf8" },
    ).trim();
    if (changes && changes.split("\n").some((line) => !line.startsWith("A\t")))
      throw new ReleaseError(
        "Migrações existentes não podem ser alteradas, removidas ou renomeadas; criar nova migração.",
      );
  }
  if (eventName === "pull_request")
    releaseMessage(
      event.pull_request.title,
      event.pull_request.number,
      event.pull_request.head.sha,
    );
  return validatePackageVersion(pkg, lock, previous);
}
function githubClient(repository, token) {
  const base = `https://api.github.com/repos/${repository}`;
  const call = (path, schema, options) =>
    requestJson(`${base}${path}`, token, schema, options);
  return {
    async head() {
      return (await call("/git/ref/heads/main", gitRefSchema)).object.sha;
    },
    async tag(tag) {
      return (
        (
          await call(`/git/ref/tags/${tag}`, gitRefSchema, {
            optional404: true,
          })
        )?.object.sha ?? null
      );
    },
    async pullRequest(sha) {
      const candidates = (
        await call(`/commits/${sha}/pulls?per_page=100`, z.array(prSchema))
      ).filter(
        (pr) =>
          pr.merged_at && pr.base.ref === "main" && pr.merge_commit_sha === sha,
      );
      if (candidates.length !== 1)
        throw new ReleaseError(
          "Commit precisa corresponder a um único PR mesclado na main; push direto não publica.",
        );
      return candidates[0];
    },
    async createTag(tag, sha) {
      const current = await this.tag(tag);
      if (current === sha) return;
      if (current)
        throw new ReleaseError(
          "Tag Git já existe em outro commit; publicação não será sobrescrita.",
        );
      const created = await call("/git/refs", gitRefSchema, {
        method: "POST",
        body: { ref: `refs/tags/${tag}`, sha },
      });
      if (created.object.sha !== sha)
        throw new ReleaseError(
          "Tag criada não corresponde ao commit publicado.",
        );
    },
  };
}

// Dependencies are explicit to test failure/retry ordering without any remote writes.
export async function publishRelease({
  release,
  github,
  cloudflare,
  migrationNames,
  prepare,
  upload,
  record,
}) {
  let prepared;
  if ((await github.head()) !== release.sha) {
    record.status = "superseded";
    return;
  }
  const live = await cloudflare.active();
  record.previous = {
    deploymentId: live.deployment.id,
    versionId: live.version.id,
  };
  const decision = deploymentDecision(
    release.tag,
    release.sha,
    live.version,
    await github.tag(release.tag),
  );
  if (decision === "deploy") {
    checkMigrationNames(migrationNames, await cloudflare.migrations());
    try {
      prepared = await prepare();
      // Recheck after the potentially long build, immediately before the upload.
      if ((await github.head()) !== release.sha) {
        record.status = "superseded";
        return;
      }
      checkMigrationNames(migrationNames, await cloudflare.migrations());
      const latest = await cloudflare.active();
      if (latest.deployment.id !== live.deployment.id)
        throw new ReleaseError(
          "Produção mudou durante o build; conferir antes de repetir.",
        );
      record.uploadAttempted = true;
      await upload(prepared, release);
    } finally {
      prepared?.cleanup();
    }
  }
  const actual = await cloudflare.active();
  if (
    actual.version.annotations?.["workers/tag"] !== release.tag ||
    !actual.version.annotations?.["workers/message"]?.endsWith(
      `commit ${release.sha})`,
    )
  )
    throw new ReleaseError(
      "Publicação ainda não confirmada pelos metadados. Conferir produção e repetir a execução; não há rollback automático.",
    );
  record.confirmed = {
    deploymentId: actual.deployment.id,
    versionId: actual.version.id,
    traffic: 100,
    tag: release.tag,
    message: actual.version.annotations["workers/message"],
  };
  // Even a tag API failure must preserve the confirmed deployment in the report.
  record.status = "deployed-tag-pending";
  await github.createTag(release.tag, release.sha);
  record.status = decision === "already-live" ? "already-live" : "deployed";
}

async function main(command) {
  if (process.env.GITHUB_ACTIONS !== "true")
    throw new ReleaseError(
      "Este comando é exclusivo do GitHub Actions; não faz deploy local.",
    );
  const eventName = process.env.GITHUB_EVENT_NAME;
  if (!["pull_request", "push", "workflow_dispatch"].includes(eventName))
    throw new ReleaseError("Evento não autorizado.");
  const event = json(process.env.GITHUB_EVENT_PATH);
  const version = validateReleaseFiles(event, eventName);
  if (command === "validate") {
    console.log(`Versão ${version}: pacote e lockfile consistentes.`);
    return;
  }
  if (
    command !== "deploy" ||
    eventName === "pull_request" ||
    process.env.GITHUB_REF !== "refs/heads/main"
  )
    throw new ReleaseError(
      "Publicação permitida somente na main após validação.",
    );
  const sha = valid(shaSchema, process.env.GITHUB_SHA, "Commit");
  const checkedOut = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (sha !== checkedOut)
    throw new ReleaseError("Checkout não corresponde ao commit validado.");
  const repository = valid(
    z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
    process.env.GITHUB_REPOSITORY,
    "Repositório",
  );
  const github = githubClient(repository, process.env.GITHUB_TOKEN);
  const record = {
    sha,
    tag: `v${version}`,
    status: "failed",
    uploadAttempted: false,
  };
  try {
    const pr = await github.pullRequest(sha);
    const release = {
      sha,
      tag: record.tag,
      message: releaseMessage(pr.title, pr.number, sha),
      pullRequest: pr.number,
    };
    record.pullRequest = pr.number;
    const parsed = ts.parseConfigFileTextToJson(
      "wrangler.jsonc",
      readFileSync(join(root, "wrangler.jsonc"), "utf8"),
    );
    if (parsed.error) throw new ReleaseError("Configuração Wrangler inválida.");
    const config = valid(
      configSchema,
      parsed.config,
      "Configuração de publicação",
    );
    const client = cloudflareClient(config, process.env.CLOUDFLARE_API_TOKEN);
    const files = readdirSync(join(root, "migrations")).filter((file) =>
      file.endsWith(".sql"),
    );
    if (!files.length || files.some((f) => !/^\d{4}_[a-z0-9_]+\.sql$/.test(f)))
      throw new ReleaseError("Lista de migrações inválida.");
    await publishRelease({
      release,
      github,
      record,
      migrationNames: files,
      cloudflare: {
        active: () => client.active(),
        migrations: () => client.migrations(config.d1_databases[0].database_id),
      },
      prepare: () => prepareDeployment(root),
      upload: (prepared, metadata) => {
        const env = {};
        for (const key of [
          "PATH",
          "HOME",
          "TMPDIR",
          "LANG",
          "LC_ALL",
          "CI",
          "CLOUDFLARE_API_TOKEN",
        ])
          if (process.env[key]) env[key] = process.env[key];
        env.CLOUDFLARE_ACCOUNT_ID = config.account_id;
        env.WRANGLER_SEND_METRICS = "false";
        deployPrepared(prepared.workspace, metadata.tag, metadata.message, env);
      },
    });
  } finally {
    const report = join(process.env.RUNNER_TEMP, "cantina-deployment.json");
    writeFileSync(report, `${JSON.stringify(record, null, 2)}\n`, {
      mode: 0o600,
    });
    summary(
      `### Publicação ${record.tag}\n\nEstado: **${record.status}**\n\nCommit: \`${sha}\`\n\n${record.confirmed ? `Worker: \`${record.confirmed.versionId}\` · deployment: \`${record.confirmed.deploymentId}\` · tráfego: 100%.` : "Nenhuma publicação confirmada por este fluxo. Se houve tentativa de upload, conferir o estado remoto antes de repetir."}\n\nRelatório: artefato cantina-deployment desta execução. Migrações não são aplicadas pelo Actions.`,
    );
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv[2]).catch((error) => {
    // Never print HTTP bodies, headers, tokens, raw Zod errors or provider payloads.
    if (error instanceof ReleaseError) console.error(error.message);
    console.error(
      "Fluxo interrompido: conferir versão/PR, permissões (Workers Editor e D1 Read), migrações e relatório da execução. Não houve rollback ou migração automática.",
    );
    process.exitCode = 1;
  });
}
