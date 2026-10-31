import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { prepareDeployment } from "./deploy-build.mjs";
import { deployPrepared } from "./deploy-worker.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
let parsed;
try {
  parsed = parseArgs({
    options: {
      tag: { type: "string" },
      message: { type: "string" },
      "build-only": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const tag = parsed.values.tag ?? parsed.positionals[0];
const message = parsed.values.message ?? parsed.positionals[1];
if (
  (!parsed.values["build-only"] && (!tag?.trim() || !message?.trim())) ||
  parsed.positionals.length > 2
) {
  console.error('Uso: npm run deploy -- v0.3.2 "Descrição curta da entrega"');
  console.error(
    'Ou:  npm run deploy -- --tag v0.3.2 --message "Descrição curta da entrega"',
  );
  process.exit(1);
}

// Publishing remains explicit; build-only performs no upload or resource changes.
let prepared;
let exitCode = 1;
try {
  prepared = prepareDeployment(projectRoot);
  if (parsed.values["build-only"]) {
    exitCode = 0;
  } else {
    deployPrepared(prepared.workspace, tag, message);
    exitCode = 0;
  }
} catch (error) {
  console.error(error.message);
} finally {
  prepared?.cleanup();
}
process.exitCode = exitCode;
