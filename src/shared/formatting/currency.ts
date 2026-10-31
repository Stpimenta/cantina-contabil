const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(amountCents: number) {
  if (!Number.isSafeInteger(amountCents))
    throw new RangeError("Valor monetário inválido");
  const amount = BigInt(amountCents);
  const absolute = amount < 0n ? -amount : amount;
  const whole = absolute / 100n;
  const value = amount < 0n ? (whole === 0n ? -0 : -whole) : whole;
  const fraction = String(absolute % 100n).padStart(2, "0");
  return currency
    .formatToParts(value)
    .map((part) => (part.type === "fraction" ? fraction : part.value))
    .join("");
}
