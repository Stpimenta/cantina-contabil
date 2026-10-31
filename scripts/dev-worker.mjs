import { spawnSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
  localConfig,
  localEnvPath,
  persistRoot,
  prepareLocalEnvironment,
  projectRoot,
} from "./local-env.mjs";
import { migrateLocalDatabase } from "./local-db.mjs";

const require = createRequire(import.meta.url);

export function startLocalWorker(env) {
  console.log("Gerando prévia local do Worker; nenhuma publicação será feita.");
  const build = spawnSync(
    "npm",
    ["run", "build:cloudflare", "--", "--config", localConfig],
    { cwd: projectRoot, env, stdio: "inherit" },
  );
  if (build.error) throw build.error;
  if (build.status !== 0)
    throw new Error("A compilação da prévia local falhou.");

  return spawn(
    process.execPath,
    [
      require.resolve("wrangler"),
      "dev",
      "--local",
      "--config",
      localConfig,
      "--env-file",
      localEnvPath,
      "--persist-to",
      persistRoot,
    ],
    {
      cwd: projectRoot,
      env: { ...env, OPEN_NEXT_DEPLOY: "true" },
      stdio: "inherit",
    },
  );
}

export function printWorkerLinks() {
  console.log("  Worker / Miniflare:       http://localhost:8787");
  console.log(
    "  Explorador local / D1:    http://localhost:8787/cdn-cgi/local/explorer",
  );
  console.log("  Inspector do Worker:      http://127.0.0.1:9229");
  console.log(
    "  Bundle do Worker: reinicie npm run dev para atualizar após alterações.",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const env = prepareLocalEnvironment();
    migrateLocalDatabase(env);
    const child = startLocalWorker(env);
    printWorkerLinks();
    for (const signal of ["SIGINT", "SIGTERM"])
      process.on(signal, () => child.kill(signal));
    child.on("error", (error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
    child.on("exit", (code) => {
      process.exitCode = code ?? 0;
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
