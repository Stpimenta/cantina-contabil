import { z } from "zod";
export const RECEIPT_MAX_FILES = 5;
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
export const receiptListSchema = z
  .array(
    z.object({
      size: z.number().int().positive().max(RECEIPT_MAX_BYTES).nullable(),
      type: z.enum(RECEIPT_TYPES),
    }),
  )
  .max(RECEIPT_MAX_FILES);
export function receiptMetadata(file: File) {
  return { size: file.size, type: file.type };
}
