import { z } from "zod";
export function parseMoney(value: string): number | null {
  const text = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  if (whole.length > 16) return null;
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}
export const moneyInputSchema = z
  .string()
  .transform(parseMoney)
  .pipe(z.number());
export const moneyInputValue = (cents: number) =>
  `${BigInt(cents) / 100n},${String(BigInt(cents) % 100n).padStart(2, "0")}`;
