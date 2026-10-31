import { formatDateOnly } from "@/shared/formatting/date-time";
export function normalizeBirthDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value))
    return null;
  const date = value.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
    ? date
    : null;
}

export function normalizePhoneField(value: unknown): string | null {
  return typeof value === "string" && value.trim() && value.trim().length <= 64
    ? value.trim()
    : null;
}

export function formatBirthDate(value: unknown): string {
  const date = normalizeBirthDate(value);
  return date ? formatDateOnly(date) : "Não informado";
}

export function formatPhone(country: unknown, number: unknown): string {
  const phone = normalizePhoneField(number);
  const code = normalizePhoneField(country);
  if (!phone) return "Não informado";
  if (!code || phone.startsWith("+")) return phone;
  return `${code.startsWith("+") ? code : `+${code}`} ${phone}`;
}
