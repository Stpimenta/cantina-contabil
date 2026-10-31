import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

// Receives the already built and inspected package; does not build or migrate.
export function deployPrepared(workspace, tag, message, env = process.env) {
  const args = [
    "--no-install",
    "wrangler",
    "deploy",
    "--config",
    join(workspace, "wrangler.jsonc"),
    ...(env.CLOUDFLARE_API_TOKEN ? [] : ["--profile", "cantina-contabil"]),
    "--tag",
    tag,
    "--message",
    message,
  ];
  if (env.CANTINA_SECRETS_FILE)
    args.push(
      "--secrets-file",
      resolve(
        fileURLToPath(new URL("../", import.meta.url)),
        env.CANTINA_SECRETS_FILE,
      ),
    );
  const result = spawnSync("npx", args, {
    cwd: workspace,
    stdio: "inherit",
    env: { ...env, OPEN_NEXT_DEPLOY: "true" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      "Envio não confirmado. Conferir o estado remoto antes de repetir; nenhum rollback automático foi feito.",
    );
}
