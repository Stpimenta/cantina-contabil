import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { parseEnv } from "node:util";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
export const localEnvPath = join(projectRoot, ".env");
export const localConfig = join(projectRoot, "wrangler.local.jsonc");
export const persistRoot = join(projectRoot, ".wrangler/state");
export const localDatabase = "cantina-contabil-local";

export function prepareLocalEnvironment() {
  const envPath = localEnvPath;
  let source = existsSync(envPath)
    ? readFileSync(envPath, "utf8")
    : readFileSync(join(projectRoot, ".env.example"), "utf8");
  let values = parseEnv(source);
  if (!values.SESSION_SECRET || values.SESSION_SECRET.length < 32) {
    if (values.SESSION_SECRET?.length)
      throw new Error(
        "SESSION_SECRET local precisa ter pelo menos 32 caracteres; ajuste .env.",
      );
    const secret = randomBytes(32).toString("hex");
    source = /^\s*SESSION_SECRET\s*=.*$/m.test(source)
      ? source.replace(/^\s*SESSION_SECRET\s*=.*$/m, `SESSION_SECRET=${secret}`)
      : `${source}${source.endsWith("\n") || !source ? "" : "\n"}SESSION_SECRET=${secret}\n`;
    writeFileSync(envPath, source, { mode: 0o600 });
    values = parseEnv(source);
  }
  return {
    ...values,
    ...process.env,
    WRANGLER_SEND_METRICS: "false",
    CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "true",
  };
}
