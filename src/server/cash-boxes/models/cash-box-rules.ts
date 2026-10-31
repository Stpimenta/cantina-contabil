import { throwBusinessError } from "@/shared/errors/business-error";
import type { WriteOutcome } from "../repositories/cash-box.repository";
export const CASH_BOX_NAME_MAX = 100;
export const CASH_BOX_DESCRIPTION_MAX = 500;
export const normalizeName = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ");
export const nameKey = (value: string) =>
  normalizeName(value).toLocaleLowerCase("pt-BR");
export const cashBoxMissing = () =>
  throwBusinessError({
    code: "CASH_BOX_NOT_FOUND",
    category: "not_found",
  });
export const cashBoxConflict = () =>
  throwBusinessError({
    code: "CASH_BOX_CHANGED",
    category: "conflict",
  });
export function mapWriteOutcome<T>(outcome: WriteOutcome, value: T): T {
  if (outcome === "duplicate")
    throwBusinessError({
      code: "CASH_BOX_NAME_EXISTS",
      category: "conflict",
      issues: { name: "CASH_BOX_NAME_EXISTS" },
    });
  if (outcome === "linked")
    throwBusinessError({
      code: "CASH_BOX_HAS_MOVEMENTS",
      category: "conflict",
    });
  if (outcome === "stale") return cashBoxConflict();
  return value;
}
