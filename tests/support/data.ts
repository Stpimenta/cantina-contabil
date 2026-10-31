import type { Session } from "@/server/auth/models/session.model";
export const uuid = () => crypto.randomUUID();
export function session(): Session {
  const issuedAt = Math.floor(Date.now() / 1000);
  return {
    user: {
      id: 1,
      name: "Pessoa de teste",
      email: "teste@example.invalid",
      birthDate: null,
      phoneCountry: null,
      phoneNumber: null,
    },
    role: "tesouraria",
    issuedAt,
    expiresAt: issuedAt + 7200,
  };
}
export const pdf = (text = "sintetico") =>
  new File([`%PDF-1.4\n${text}`], "comprovante.pdf", {
    type: "application/pdf",
  });
export const donationInput = (cashBoxId: string, amount = "100") => ({
  cashBoxId,
  amount,
  donatedOn: "2026-10-30",
  donorName: "Pessoa sintética",
  note: "",
});
export const movementInput = (
  cashBoxId: string,
  amount = "20",
  direction: "incoming" | "outgoing" = "incoming",
) => ({
  requestId: uuid(),
  cashBoxId,
  amount,
  direction,
  occurredOn: "2026-10-30",
  reason: "Registro sintético",
});
export const eventInput = (cashBoxId: string) => ({
  requestId: uuid(),
  cashBoxId,
  name: "Evento sintético",
  description: "",
  occursOn: "2026-10-30",
  products: [{ id: uuid(), name: "Produto", icon: "bag", price: "10" }],
});
export const supplyInput = (cashBoxId: string | null, amount = "25") => ({
  requestId: uuid(),
  name: "Insumo",
  description: "",
  donorName: "",
  icon: "bag",
  amount,
  source: cashBoxId ? "purchase" : "donation",
  cashBoxId,
  received: !!cashBoxId,
});
