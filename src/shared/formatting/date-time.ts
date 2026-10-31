import { isDateOnly } from "@/shared/dates/date-only";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Sao_Paulo",
});
function parts(formatter: Intl.DateTimeFormat, value: Date) {
  const values = Object.fromEntries(
    formatter.formatToParts(value).map((part) => [part.type, part.value]),
  );
  return {
    day: values.day,
    month: values.month,
    year: values.year.padStart(4, "0"),
    hour: values.hour,
    minute: values.minute,
  };
}
export function formatDateTime(value: string) {
  const formatted = parts(dateTime, new Date(value));
  return `${formatted.day}/${formatted.month}/${formatted.year}, ${formatted.hour}:${formatted.minute}`;
}
export function formatDateOnly(value: string) {
  if (!isDateOnly(value)) return "Não informado";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
export function currentDateInSaoPaulo() {
  const formatted = parts(dateTime, new Date());
  return `${formatted.year}-${formatted.month}-${formatted.day}`;
}
