import { spawnSync } from "node:child_process";
import {
  localConfig,
  localEnvPath,
  localDatabase,
  persistRoot,
  prepareLocalEnvironment,
  projectRoot,
} from "./local-env.mjs";

export function migrateLocalDatabase(env = prepareLocalEnvironment()) {
  console.log(
    "Preparando D1 local — dados persistidos em .wrangler/state (sem acesso ao D1 remoto).",
  );
  const result = spawnSync(
    "npx",
    [
      "--no-install",
      "wrangler",
      "d1",
      "migrations",
      "apply",
      localDatabase,
      "--local",
      "--config",
      localConfig,
      "--env-file",
      localEnvPath,
      "--persist-to",
      persistRoot,
    ],
    { cwd: projectRoot, env, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error("Não foi possível aplicar as migrações do D1 local.");
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    migrateLocalDatabase();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
