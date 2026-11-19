import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareDeployment } from "./deploy-build.mjs";

// Read-only diagnosis of an isolated production package; never uploads or migrates.
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
let prepared;
try {
  prepared = prepareDeployment(projectRoot);
  const assets = join(prepared.workspace, ".open-next/assets");
  const references = new Map();
  const target = process.argv[2];
  if (
    target &&
    !/^\/_next\/static\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:js|css)$/.test(
      target,
    )
  )
    throw new Error("Informe somente um caminho /_next/static/...js ou .css.");
  function scan(directory) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) scan(path);
      else if (/\.(html|js|json|cache)$/.test(entry.name)) {
        const contents = readFileSync(path, "utf8");
        for (const [match] of contents.matchAll(
          /(?:\/_next\/)?static\/[A-Za-z0-9_./-]+\.(?:js|css)/g,
        )) {
          const asset = match.startsWith("/_next/")
            ? match.slice(1)
            : `_next/${match}`;
          if (!references.has(asset))
            references.set(asset, relative(prepared.workspace, path));
        }
      }
    }
  }
  scan(join(prepared.workspace, ".open-next/cache"));
  scan(
    join(
      prepared.workspace,
      ".open-next/server-functions/default/.next/server/app",
    ),
  );
  scan(assets);
  if (target) {
    const asset = target.slice(1);
    const file = join(assets, asset);
    console.log("Arquivo investigado:", target);
    console.log("Referenciado neste build:", references.has(asset));
    console.log("Existe no pacote:", existsSync(file));
    if (existsSync(file)) {
      console.log("Tamanho em bytes:", statSync(file).size);
      console.log(
        "SHA-256:",
        createHash("sha256").update(readFileSync(file)).digest("hex"),
      );
    }
    if (references.has(asset))
      console.log("Origem da referência:", references.get(asset));
  }
  const missing = [...references].filter(
    ([asset]) => !existsSync(join(assets, asset)),
  );
  console.log(`Referências estáticas distintas conferidas: ${references.size}`);
  if (!references.size)
    throw new Error("Nenhuma referência encontrada; diagnóstico inconclusivo.");
  if (missing.length) {
    console.table(
      missing.map(([asset, source]) => ({ arquivo: asset, origem: source })),
    );
    throw new Error(
      `${missing.length} arquivo(s) referenciado(s) ausente(s) do pacote.`,
    );
  }
  console.log(
    "Todas as referências encontradas existem no pacote isolado. Isso não confirma os arquivos ativos em produção.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  prepared?.cleanup();
}
