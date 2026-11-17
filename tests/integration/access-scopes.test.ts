import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { harness, type Harness } from "../support/harness";
import {
  eventInput,
  movementInput,
  donationInput,
  supplyInput,
} from "../support/data";
import type { Session } from "@/server/auth/models/session.model";
import { CreateEventUseCase } from "@/server/events/use-cases/create-event.use-case";
import { GetEventUseCase } from "@/server/events/use-cases/get-event.use-case";
import { ListEventsUseCase } from "@/server/events/use-cases/list-events.use-case";
import { UpdateEventUseCase } from "@/server/events/use-cases/update-event.use-case";
import { CreateMovementUseCase } from "@/server/movements/use-cases/create-movement.use-case";
import { ListMovementsUseCase } from "@/server/movements/use-cases/list-movements.use-case";
import { CreateDonationUseCase } from "@/server/donations/use-cases/create-donation.use-case";
import { ListDonationsUseCase } from "@/server/donations/use-cases/list-donations.use-case";
import { ListCashBoxesUseCase } from "@/server/cash-boxes/use-cases/list-cash-boxes.use-case";
import { GetCashBoxUseCase } from "@/server/cash-boxes/use-cases/get-cash-box.use-case";
import { GetHomeUseCase } from "@/server/home/use-cases/get-home.use-case";
import { CreateSupplyUseCase } from "@/server/events/use-cases/create-supply.use-case";
import { D1LocalAccountRepository } from "@/server/users/infrastructure/d1-local-account.repository";
let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
const denied = { details: { code: "ACCESS_DENIED" } };
describe("consulta e alteração por caixa/evento", () => {
  it("financeiro recebe somente seus registros, opções e totais antes da paginação", async () => {
    const own = await h.box("Permitido"),
      other = await h.box("Outro");
    const s: Session = {
      ...h.actor,
      role: "finance",
      cashBoxIds: [own.id],
      cashBoxWriteIds: [],
    };
    const movement = new CreateMovementUseCase(
      h.movements,
      h.boxes,
      h.receipts,
    );
    await movement.execute(h.actor, movementInput(own.id, "20"));
    for (let n = 0; n < 16; n++)
      await movement.execute(h.actor, movementInput(other.id, "1"));
    const donation = new CreateDonationUseCase(h.donations, h.boxes);
    await donation.execute(
      h.actor,
      crypto.randomUUID(),
      donationInput(own.id, "10"),
    );
    await donation.execute(
      h.actor,
      crypto.randomUUID(),
      donationInput(other.id, "10"),
    );
    expect(
      (await new ListCashBoxesUseCase(h.boxes).execute(s, {})).items.map(
        (x) => x.id,
      ),
    ).toEqual([own.id]);
    const movements = await new ListMovementsUseCase(h.movements).execute(
      s,
      {},
    );
    expect(movements.total).toBe(1);
    expect(movements.items[0].cashBoxId).toBe(own.id);
    expect(
      (await new ListDonationsUseCase(h.donations).execute(s, {})).total,
    ).toBe(1);
    expect(
      await new GetHomeUseCase(h.boxes, h.events).execute(s),
    ).toMatchObject({ boxCount: 1, realCents: 3000 });
    await expect(
      new GetCashBoxUseCase(h.boxes).execute(s, other.id),
    ).rejects.toMatchObject(denied);
    await expect(
      movement.execute(s, movementInput(own.id)),
    ).rejects.toMatchObject(denied);
    await movement.execute(
      { ...s, cashBoxWriteIds: [own.id] },
      movementInput(own.id),
    );
  });
  it("operador não recebe outro evento do mesmo caixa nem dados gerais financeiros", async () => {
    const box = await h.box();
    const create = new CreateEventUseCase(h.events, h.boxes);
    const input = eventInput(box.id),
      own = await create.execute(h.actor, input),
      other = await create.execute(h.actor, eventInput(box.id));
    const s: Session = {
      ...h.actor,
      role: "operator",
      eventIds: [own.id],
      eventWriteIds: [],
      cashBoxIds: [],
      cashBoxWriteIds: [],
    };
    const list = await new ListEventsUseCase(h.events).execute(s, {});
    expect(list.total).toBe(1);
    expect(list.items.map((x) => x.id)).toEqual([own.id]);
    await expect(
      new GetEventUseCase(h.events).execute(s, other.id),
    ).rejects.toMatchObject(denied);
    await expect(
      new GetCashBoxUseCase(h.boxes).execute(s, box.id),
    ).rejects.toMatchObject(denied);
    const update = new UpdateEventUseCase(h.events, h.boxes);
    await expect(
      update.execute(s, own.id, own.version, {
        ...input,
        requestId: crypto.randomUUID(),
        name: "Alterado",
      }),
    ).rejects.toMatchObject(denied);
    await update.execute(
      { ...s, eventWriteIds: [own.id] },
      own.id,
      own.version,
      { ...input, requestId: crypto.randomUUID(), name: "Alterado" },
    );
    expect((await h.events.find(own.id))?.name).toBe("Alterado");
    expect((await h.events.find(other.id))?.name).toBe("Evento sintético");
  });
  it("operador não movimenta outro caixa como pagador de insumo", async () => {
    const box = await h.box("Evento"),
      payer = await h.box("Pagador");
    const event = await new CreateEventUseCase(h.events, h.boxes).execute(
      h.actor,
      eventInput(box.id),
    );
    const s: Session = {
      ...h.actor,
      role: "operator",
      eventIds: [event.id],
      eventWriteIds: [event.id],
    };
    const create = new CreateSupplyUseCase(
      h.supplies,
      h.events,
      h.boxes,
      h.receipts,
    );
    await expect(
      create.execute(s, event.id, supplyInput(payer.id), []),
    ).rejects.toMatchObject(denied);
    expect((await h.boxes.find(payer.id))?.balanceCents).toBe(0);
  });
  it("persiste grants e auditoria atomicamente e rejeita alteração fora da consulta", async () => {
    const repo = new D1LocalAccountRepository(h.db),
      box = await h.box();
    const account = (await repo.reserveInvited(
      "Pessoa",
      "grants@example.invalid",
      new Date().toISOString(),
    ))!;
    const input = {
      id: account.id,
      version: account.version,
      role: "finance" as const,
      blocked: false,
      cashBoxIds: [box.id],
      cashBoxWriteIds: [],
      eventIds: [],
      eventWriteIds: [],
    };
    expect(
      await repo.manage(input, h.actor.user.id, new Date().toISOString()),
    ).toBe(true);
    expect(await repo.findById(account.id)).toMatchObject({
      role: "finance",
      cashBoxIds: [box.id],
      cashBoxWriteIds: [],
    });
    expect(
      await repo.manage(
        { ...input, version: 2, cashBoxIds: [], cashBoxWriteIds: [box.id] },
        h.actor.user.id,
        new Date().toISOString(),
      ),
    ).toBe(false);
    expect((await repo.findById(account.id))?.version).toBe(2);
    const audit = await h.d1
      .prepare(
        "SELECT after_json FROM local_account_audit WHERE account_id=? ORDER BY id DESC LIMIT 1",
      )
      .bind(account.id)
      .first<{ after_json: string }>();
    expect(JSON.parse(audit!.after_json)).toMatchObject({
      role: "finance",
      access: { cashBoxWriteIds: [] },
    });
  });
});
