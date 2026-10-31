import { throwBusinessError } from "@/shared/errors/business-error";
export async function readReceiptContent(file: File | null, movement = false) {
  let body: ArrayBuffer | null = null;
  let hash: string | null = null;
  if (file) {
    body = await file.arrayBuffer();
    const b = new Uint8Array(body);
    const signature =
      file.type === "image/jpeg"
        ? b[0] === 255 && b[1] === 216 && b[2] === 255
        : file.type === "image/png"
          ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v)
          : file.type === "application/pdf"
            ? new TextDecoder().decode(b.slice(0, 5)) === "%PDF-"
            : new TextDecoder().decode(b.slice(0, 4)) === "RIFF" &&
              new TextDecoder().decode(b.slice(8, 12)) === "WEBP";
    if (!signature)
      throwBusinessError({
        code: movement ? "INVALID_MOVEMENT_INPUT" : "INVALID_SUPPLY_INPUT",
        category: "validation",
        issues: {
          receipts: movement ? "INVALID_MOVEMENT_RECEIPT" : "INVALID_RECEIPT",
        },
      });
    hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", body)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
  }
  return { body, hash };
}
