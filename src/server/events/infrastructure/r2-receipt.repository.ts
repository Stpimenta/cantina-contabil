import "server-only";
import type { R2Bucket } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { InfrastructureError } from "@/shared/errors/infrastructure-error";
import type { ReceiptRepository } from "../repositories/receipt.repository";
export class R2ReceiptRepository implements ReceiptRepository {
  private bucket() {
    const bucket = (
      getCloudflareContext().env as unknown as { RECEIPTS?: R2Bucket }
    ).RECEIPTS;
    if (!bucket)
      throw new InfrastructureError(
        "Binding de comprovantes ausente",
        "r2.receipts",
      );
    return bucket;
  }
  async put(key: string, body: ArrayBuffer, type: string) {
    await this.bucket().put(key, body, { httpMetadata: { contentType: type } });
  }
  async get(key: string) {
    const result = await this.bucket().get(key);
    return result
      ? {
          body: await result.arrayBuffer(),
          type: result.httpMetadata?.contentType ?? "application/octet-stream",
        }
      : null;
  }
}
