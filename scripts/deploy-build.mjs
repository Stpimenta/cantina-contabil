import {
  constants,
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";

function run(command, args, cwd, env) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `Preparação da publicação falhou (código ${result.status ?? 1}).`,
    );
}

function privateValues(projectRoot) {
  const envPath = join(projectRoot, ".env");
  const local = existsSync(envPath)
    ? parseEnv(readFileSync(envPath, "utf8"))
    : {};
  return Object.entries({ ...process.env, ...local })
    .filter(
      ([key, value]) =>
        /secret|token|password|senha|private.key|access.key/i.test(key) &&
        value &&
        value.length >= 8,
    )
    .map(([, value]) => Buffer.from(value));
}

function verifyFiles(directory, values) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink())
      throw new Error("Pacote de publicação contém link simbólico inesperado.");
    if (entry.isDirectory()) verifyFiles(path, values);
    else if (entry.isFile()) {
      if (
        /^\.env(?:\.|$)|^\.dev\.vars(?:\.|$)|\.(?:pem|key)$/i.test(entry.name)
      )
        throw new Error(
          "Pacote de publicação contém arquivo de configuração privada.",
        );
      const content = readFileSync(path);
      if (values.some((value) => content.includes(value)))
        throw new Error(
          "Publicação bloqueada: valor privado local encontrado no pacote gerado.",
        );
    }
  }
}

export function prepareDeployment(projectRoot) {
  const workspace = mkdtempSync(join(tmpdir(), "cantina-contabil-deploy-"));
  chmodSync(workspace, 0o700);
  const cleanup = () => rmSync(workspace, { recursive: true, force: true });
  try {
    // Explicit allowlist: never copy .env, credentials, local data or existing builds.
    for (const name of [
      "src",
      "public",
      "scripts",
      "migrations",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "next.config.ts",
      "next-env.d.ts",
      "open-next.config.ts",
      "wrangler.jsonc",
    ]) {
      cpSync(join(projectRoot, name), join(workspace, name), {
        recursive: true,
        mode: constants.COPYFILE_FICLONE,
        verbatimSymlinks: true,
      });
    }
    // Independent copy: the active development dependencies and outputs are untouched.
    cpSync(join(projectRoot, "node_modules"), join(workspace, "node_modules"), {
      recursive: true,
      mode: constants.COPYFILE_FICLONE,
      verbatimSymlinks: true,
    });
    const env = {};
    for (const key of [
      "PATH",
      "HOME",
      "TMPDIR",
      "TMP",
      "TEMP",
      "LANG",
      "LC_ALL",
      "SystemRoot",
      "SYSTEMROOT",
      "COMSPEC",
      "PATHEXT",
    ])
      if (process.env[key]) env[key] = process.env[key];
    env.NEXT_TELEMETRY_DISABLED = "1";
    env.WRANGLER_SEND_METRICS = "false";
    console.log("Compilando publicação isolada, sem .env ou segredos locais.");
    run("npm", ["run", "build:cloudflare"], workspace, env);
    const compiledEnv = readFileSync(
      join(workspace, ".open-next/cloudflare/next-env.mjs"),
      "utf8",
    );
    const modes = [
      ...compiledEnv.matchAll(
        /export const (production|development|test) = (\{[^\n]*\});/g,
      ),
    ];
    if (
      modes.length !== 3 ||
      modes.some(([, , value]) => Object.keys(JSON.parse(value)).length !== 0)
    )
      throw new Error(
        "Publicação bloqueada: variáveis de arquivo de ambiente embutidas no Worker.",
      );
    const values = privateValues(projectRoot);
    verifyFiles(join(workspace, ".open-next"), values);
    // Check the final Wrangler bundle as well, before any upload.
    run(
      "npx",
      [
        "--no-install",
        "wrangler",
        "deploy",
        "--config",
        join(workspace, "wrangler.jsonc"),
        "--dry-run",
        "--outdir",
        join(workspace, ".deploy-check"),
      ],
      workspace,
      env,
    );
    verifyFiles(join(workspace, ".deploy-check"), values);
    console.log(
      "Pacote conferido: sem arquivos de ambiente ou valores privados locais detectados.",
    );
    return { workspace, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
}
