import { ReleaseError } from "./release-error.mjs";
import { z } from "zod";
export const releaseVersionSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
function versionValue(value) {
  const result = releaseVersionSchema.safeParse(value);
  if (!result.success)
    throw new ReleaseError(
      "Versão deve usar X.Y.Z, sem prefixo v ou pré-release.",
    );
  return result.data;
}
export function compareVersions(left, right) {
  const a = versionValue(left).split(".").map(BigInt);
  const b = versionValue(right).split(".").map(BigInt);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}
export function validatePackageVersion(pkg, lock, previous) {
  const version = versionValue(pkg.version);
  if (lock.version !== version || lock.packages?.[""]?.version !== version)
    throw new ReleaseError(
      "package.json e package-lock.json precisam da mesma versão.",
    );
  if (previous && compareVersions(version, previous) <= 0)
    throw new ReleaseError(
      "A versão do PR precisa ser maior que a versão da main.",
    );
  return version;
}
export function releaseMessage(title, number, sha) {
  if (
    !Number.isSafeInteger(number) ||
    number <= 0 ||
    !/^[a-f0-9]{40}$/.test(sha)
  )
    throw new ReleaseError("Número do PR ou commit inválido.");
  if (
    !/^(feat|fix)(\([a-z0-9-]+\))?: .+/.test(title) ||
    /[\r\n\x00-\x1f\x7f]/.test(title)
  )
    throw new ReleaseError(
      "Título do PR deve usar feat: ou fix: e uma descrição em inglês, em uma linha.",
    );
  let short = "";
  for (const char of title) {
    if (Buffer.byteLength(short + char) > 350) break;
    short += char;
  }
  return `${short} (#${number}; commit ${sha})`;
}
export function checkMigrationNames(local, applied) {
  const expected = [...local].sort();
  const remote = [...applied].sort();
  if (
    new Set(remote).size !== remote.length ||
    JSON.stringify(expected) !== JSON.stringify(remote)
  )
    throw new ReleaseError(
      "Migrações locais e de produção divergem. Aplicar/conferir manualmente as migrações autorizadas antes de publicar.",
    );
}
export function deploymentDecision(targetTag, sha, currentVersion, tagCommit) {
  if (tagCommit && tagCommit !== sha)
    throw new ReleaseError(
      "Tag Git já pertence a outro commit; nunca será movida.",
    );
  const currentTag = currentVersion.annotations?.["workers/tag"];
  const current = releaseVersionSchema.safeParse(currentTag?.replace(/^v/, ""));
  if (!current.success)
    throw new ReleaseError(
      "Versão ativa sem tag semântica reconhecida; conferir produção manualmente.",
    );
  const comparison = compareVersions(targetTag.slice(1), current.data);
  if (comparison < 0)
    throw new ReleaseError(
      "Deploy antigo bloqueado: produção já tem versão mais recente.",
    );
  if (comparison === 0) {
    if (
      !currentVersion.annotations?.["workers/message"]?.endsWith(
        `commit ${sha})`,
      )
    )
      throw new ReleaseError(
        "Versão já publicada por outro commit; incrementar a versão no PR.",
      );
    return "already-live";
  }
  if (tagCommit)
    throw new ReleaseError(
      "Tag já existe, mas não corresponde à produção ativa. Recuperação exige avaliação manual.",
    );
  return "deploy";
}
