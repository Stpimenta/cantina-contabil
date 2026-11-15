import { build } from "esbuild";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Private generated artifact: never place the description under public/.
const directory = await mkdtemp(join(tmpdir(), "cantina-openapi-"));
try {
  const output = join(directory, "schema.mjs");
  await build({
    entryPoints: ["src/server/api/infrastructure/openapi.ts"],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  const { createOpenApiDocument } = await import(pathToFileURL(output).href);
  const { version } = JSON.parse(await readFile("package.json", "utf8"));
  await mkdir("src/server/api/generated", { recursive: true });
  await writeFile(
    "src/server/api/generated/openapi.json",
    `${JSON.stringify(createOpenApiDocument(version), null, 2)}\n`,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
