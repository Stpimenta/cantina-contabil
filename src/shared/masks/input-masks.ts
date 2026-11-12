// Canonical input masks. Screens use MoneyField/DateField, never local copies.
import { parseMoney, moneyInputValue } from "@/shared/validation/money-input";

// Masked editing uses cents: 1 → 0,01; 1234 → 12,34. Reject letters and overflow.
// The display may contain thousands separators; the emitted value never does.
export function maskMoneyInput(text: string): string | null {
  const source = text.trim().replace(/^R\$\s*/, "");
  if (!/^[\d.,\s]*$/.test(source)) return null;
  const digits = source.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return "";
  if (digits.length > 16) return null;
  const cents = BigInt(digits);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return moneyInputValue(Number(cents));
}

export function formatMoneyInput(value: string): string {
  const cents = parseMoney(value);
  if (cents === null) return "";
  const [whole, fraction] = moneyInputValue(cents).split(",");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction}`;
}

export function maskBrazilianDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
    .filter(Boolean)
    .join("/");
}

export function maskBrazilianPostalCode(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5
    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
    : digits;
}

export function maskBrazilianPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length < 3) return `(${digits}`;
  const local = digits.slice(2);
  const split = digits.length > 10 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${local.slice(0, split)}${local.length > split ? `-${local.slice(split)}` : ""}`;
}
