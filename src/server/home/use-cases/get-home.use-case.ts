import type { Session } from "@/server/auth/models/session.model";
import type { CashBoxRepository } from "@/server/cash-boxes/repositories/cash-box.repository";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { checkAccess } from "@/shared/auth/check-access";
import { currentDateInSaoPaulo } from "@/shared/formatting/date-time";

export class GetHomeUseCase {
  constructor(
    private readonly boxes: CashBoxRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(session: Session | null) {
    checkAccess(session);
    const [boxes, upcoming] = await Promise.all([
      this.boxes.overview(),
      this.events.upcoming(currentDateInSaoPaulo()),
    ]);
    let real = 0n;
    let pending = 0n;
    for (const box of boxes) {
      if (
        !Number.isSafeInteger(box.balanceCents) ||
        !Number.isSafeInteger(box.pendingCents)
      )
        throw new Error("Saldo fora da precisão segura");
      real += BigInt(box.balanceCents);
      pending += BigInt(box.pendingCents);
    }
    if (
      real > BigInt(Number.MAX_SAFE_INTEGER) ||
      real < -BigInt(Number.MAX_SAFE_INTEGER) ||
      pending > BigInt(Number.MAX_SAFE_INTEGER)
    )
      throw new Error("Total fora da precisão segura");
    return {
      realCents: Number(real),
      pendingCents: Number(pending),
      boxCount: boxes.length,
      boxes: boxes.map(({ id, name, balanceCents, pendingCents }) => ({
        id,
        name,
        balanceCents,
        pendingCents,
      })),
      upcoming,
    };
  }
}
