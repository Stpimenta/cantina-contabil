import type { Miniflare } from "miniflare";
type R2Bucket = Awaited<ReturnType<Miniflare["getR2Bucket"]>>;
let bucket: R2Bucket | undefined;
export function setTestBucket(value: R2Bucket | undefined) {
  bucket = value;
}
export function getCloudflareContext() {
  if (!bucket) throw new Error("Ambiente descartável de testes não inicializado");
  return { env: { RECEIPTS: bucket } };
}
