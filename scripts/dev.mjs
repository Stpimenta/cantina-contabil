import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { migrateLocalDatabase } from "./local-db.mjs";
import { prepareLocalEnvironment, projectRoot } from "./local-env.mjs";
import { startLocalWorker, printWorkerLinks } from "./dev-worker.mjs";

const require = createRequire(import.meta.url);
const children = [];
let stopping = false;

function stop(signal = "SIGTERM") {
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null)
      child.kill(signal);
  }
}

for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => stop(signal));

function watch(child) {
  children.push(child);
  child.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
    stop();
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      process.exitCode = code ?? (signal ? 1 : 0);
      stop();
    }
  });
  return child;
}

try {
  const env = prepareLocalEnvironment();
  migrateLocalDatabase(env);
  // Build before Next dev starts: both commands otherwise write to .next.
  watch(startLocalWorker(env));
  console.log("\nAmbiente local — sem publicação na Cloudflare");
  console.log("  Aplicação Next.js:        http://localhost:5174");
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal)
        console.log(
          `  Aplicação na rede:        http://${address.address}:5174`,
        );
    }
  }
  printWorkerLinks();
  console.log("  D1 compartilhado:         .wrangler/state (somente local)");
  console.log("  Debug Next.js:            npm run dev:debug → porta 9230");
  console.log("  VS Code:                 F5 → Local: Next.js e navegador\n");
  const args = [
    require.resolve("next/dist/bin/next"),
    "dev",
    "--hostname",
    "0.0.0.0",
    "--port",
    "5174",
  ];
  if (process.argv.includes("--debug")) args.push("--inspect=127.0.0.1:9230");
  watch(
    spawn(process.execPath, args, {
      cwd: projectRoot,
      env,
      stdio: "inherit",
    }),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
  stop();
}
