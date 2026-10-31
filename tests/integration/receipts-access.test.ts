import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { harness, type Harness } from "../support/harness";
import {
  donationInput,
  eventInput,
  movementInput,
  pdf,
  supplyInput,
  uuid,
} from "../support/data";
import { CreateDonationUseCase } from "@/server/donations/use-cases/create-donation.use-case";
import { CreateEventUseCase } from "@/server/events/use-cases/create-event.use-case";
import { CreateSupplyUseCase } from "@/server/events/use-cases/create-supply.use-case";
import { UpdateSupplyUseCase } from "@/server/events/use-cases/update-supply.use-case";
import { GetSupplyReceiptUseCase } from "@/server/events/use-cases/get-supply-receipt.use-case";
import { CreateMovementUseCase } from "@/server/movements/use-cases/create-movement.use-case";
import { UpdateMovementUseCase } from "@/server/movements/use-cases/update-movement.use-case";
import { DeleteMovementUseCase } from "@/server/movements/use-cases/delete-movement.use-case";
import { GetMovementReceiptUseCase } from "@/server/movements/use-cases/get-movement-receipt.use-case";
import { ListSuppliesUseCase } from "@/server/events/use-cases/list-supplies.use-case";
import { GetEventUseCase } from "@/server/events/use-cases/get-event.use-case";
import { GetMovementOptionsUseCase } from "@/server/movements/use-cases/get-movement-options.use-case";
import { GetEventBoxesUseCase } from "@/server/events/use-cases/get-event-boxes.use-case";
import { isValidElement, type ReactNode } from "react";
import { ListMovementsUseCase } from "@/server/movements/use-cases/list-movements.use-case";
import { GetHomeUseCase } from "@/server/home/use-cases/get-home.use-case";
import type { Session } from "@/server/auth/models/session.model";

let h: Harness | undefined;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
  h = undefined;
});
function active() {
  if (!h) throw new Error("Harness ausente");
  return h;
}

describe("comprovantes privados e acesso", () => {
  it("movimentação lê bytes reais, mantém/remove referência e preserva objeto histórico", async () => {
    const h = active();
    const box = await h.box();
    const input = movementInput(box.id);
    const file = pdf("arquivo inicial");
    const m = await new CreateMovementUseCase(
      h.movements,
      h.boxes,
      h.receipts,
    ).execute(h.actor, input, [file]);
    const read = new GetMovementReceiptUseCase(h.movements, h.receipts);
    const result = await read.execute(h.actor, {
      id: m.id,
      receiptId: m.receipts[0].id,
    });
    expect(new Uint8Array(result.body)).toEqual(
      new Uint8Array(await file.arrayBuffer()),
    );
    expect(result.type).toBe("application/pdf");
    const edit = new UpdateMovementUseCase(h.movements, h.boxes, h.receipts);
    const update = {
      ...input,
      id: m.id,
      version: 1,
      retainedReceiptIds: [m.receipts[0].id],
    };
    await edit.execute(h.actor, update);
    expect((await h.movements.find(m.id))?.receipts).toEqual(m.receipts);
    await edit.execute(h.actor, {
      ...update,
      version: 2,
      retainedReceiptIds: [],
    });
    expect((await h.movements.find(m.id))?.receipts).toEqual([]);
    expect(await h.receipts.get(m.receipts[0].key)).not.toBeNull();
    await expect(
      read.execute(h.actor, { id: m.id, receiptId: m.receipts[0].id }),
    ).rejects.toThrow("RECEIPT_NOT_FOUND");
    const history = await h.boxes.history(box.id, 1, 15);
    expect(JSON.stringify(history)).not.toContain(m.receipts[0].key);
    const updates = history.items.filter((i) => i.action === "movement_update");
    expect(updates).toHaveLength(2);
    expect(
      updates.some(
        (i) =>
          i.movementDetails?.before?.receiptCount === 1 &&
          i.movementDetails?.after.receiptCount === 0,
      ),
    ).toBe(true);
  });
  it("compra conta anexos mantidos, rejeita remoção do último e mantém histórico privado", async () => {
    const h = active();
    const box = await h.box();
    await new CreateDonationUseCase(h.donations, h.boxes).execute(
      h.actor,
      uuid(),
      donationInput(box.id),
    );
    const e = await new CreateEventUseCase(h.events, h.boxes).execute(
      h.actor,
      eventInput(box.id),
    );
    const input = supplyInput(box.id);
    const file = pdf();
    const s = await new CreateSupplyUseCase(
      h.supplies,
      h.events,
      h.boxes,
      h.receipts,
    ).execute(h.actor, e.id, input, [file]);
    const read = new GetSupplyReceiptUseCase(h.supplies, h.events, h.receipts);
    expect(
      new Uint8Array(
        (await read.execute(h.actor, e.id, s.id, s.receipts[0].id)).body,
      ),
    ).toEqual(new Uint8Array(await file.arrayBuffer()));
    const edit = new UpdateSupplyUseCase(
      h.supplies,
      h.events,
      h.boxes,
      h.receipts,
    );
    const update = {
      ...input,
      version: 1,
      retainedReceiptIds: [s.receipts[0].id],
    };
    await edit.execute(h.actor, e.id, s.id, update, []);
    expect((await h.supplies.find(s.id))?.receipts).toEqual(s.receipts);
    await expect(
      edit.execute(
        h.actor,
        e.id,
        s.id,
        { ...update, version: 2, retainedReceiptIds: [] },
        [],
      ),
    ).rejects.toMatchObject({
      details: {
        code: "INVALID_SUPPLY_INPUT",
        issues: { receipts: "INVALID_RECEIPT" },
      },
    });
    expect((await h.supplies.find(s.id))?.version).toBe(2);
    await edit.execute(
      h.actor,
      e.id,
      s.id,
      { ...update, version: 2, retainedReceiptIds: [] },
      [pdf("substituto")],
    );
    expect(await h.receipts.get(s.receipts[0].key)).not.toBeNull();
    expect(JSON.stringify(await h.events.history(e.id, 1, 15))).not.toContain(
      s.receipts[0].key,
    );
  });
  it("anexo de outro registro não pode ser lido ou mantido na edição", async () => {
    const h = active();
    const box = await h.box();
    const create = new CreateMovementUseCase(h.movements, h.boxes, h.receipts);
    const m = await create.execute(h.actor, movementInput(box.id), [pdf("A")]);
    const other = await create.execute(h.actor, movementInput(box.id), [
      pdf("B"),
    ]);
    await expect(
      new GetMovementReceiptUseCase(h.movements, h.receipts).execute(h.actor, {
        id: m.id,
        receiptId: other.receipts[0].id,
      }),
    ).rejects.toThrow("RECEIPT_NOT_FOUND");
    await expect(
      new UpdateMovementUseCase(h.movements, h.boxes, h.receipts).execute(
        h.actor,
        {
          ...movementInput(box.id),
          id: m.id,
          version: 1,
          retainedReceiptIds: [other.receipts[0].id],
        },
      ),
    ).rejects.toThrow("MOVEMENT_CHANGED");
    expect((await h.movements.find(m.id))?.version).toBe(1);
    await new DeleteMovementUseCase(h.movements, h.boxes).execute(h.actor, {
      id: m.id,
      version: 1,
    });
    await expect(
      new GetMovementReceiptUseCase(h.movements, h.receipts).execute(h.actor, {
        id: m.id,
        receiptId: m.receipts[0].id,
      }),
    ).rejects.toThrow("RECEIPT_NOT_FOUND");
    expect(await h.receipts.get(m.receipts[0].key)).not.toBeNull();
  });
  it.each(["sem sessão", "expirada", "perfil proibido"])(
    "%s não permite leitura, gravação ou comprovante",
    async (kind) => {
      const h = active();
      const box = await h.box();
      const m = await new CreateMovementUseCase(
        h.movements,
        h.boxes,
        h.receipts,
      ).execute(h.actor, movementInput(box.id), [pdf()]);
      const actor =
        kind === "sem sessão"
          ? null
          : kind === "expirada"
            ? { ...h.actor, expiresAt: 0 }
            : ({ ...h.actor, role: "visitante" } as unknown as Session);
      const code =
        kind === "perfil proibido" ? "ACCESS_DENIED" : "SESSION_EXPIRED";
      await expect(
        new GetHomeUseCase(h.boxes, h.events).execute(actor),
      ).rejects.toThrow(code);
      await expect(
        new CreateMovementUseCase(h.movements, h.boxes, h.receipts).execute(
          actor,
          movementInput(box.id),
        ),
      ).rejects.toThrow(code);
      await expect(
        new GetMovementReceiptUseCase(h.movements, h.receipts).execute(actor, {
          id: m.id,
          receiptId: m.receipts[0].id,
        }),
      ).rejects.toThrow(code);
      expect((await h.movements.list(1, 15)).total).toBe(1);
      expect((await h.boxes.find(box.id))?.balanceCents).toBe(2000);
    },
  );
  it("arquivo com MIME válido e assinatura falsa é rejeitado antes de gravar", async () => {
    const h = active();
    const box = await h.box();
    await expect(
      new CreateMovementUseCase(h.movements, h.boxes, h.receipts).execute(
        h.actor,
        movementInput(box.id),
        [new File(["falso"], "falso.pdf", { type: "application/pdf" })],
      ),
    ).rejects.toThrow("INVALID_MOVEMENT_INPUT");
    expect((await h.movements.list(1, 15)).total).toBe(0);
    expect((await h.bucket.list()).objects).toHaveLength(0);
  });
});

// Exercise the actual server-page boundary that selects props sent to client components.
// Only composition and client rendering are replaced, never financial repositories.
vi.mock("@/server/auth/composition", () => ({
  createAuth: () => ({ getSession: { execute: async () => active().actor } }),
}));
vi.mock("@/server/movements/composition", () => ({
  createMovements: () => {
    const h = active();
    return {
      list: new ListMovementsUseCase(h.movements),
      options: new GetMovementOptionsUseCase(h.movements),
    };
  },
}));
vi.mock("@/server/events/composition", () => ({
  createEvents: () => {
    const h = active();
    return {
      get: new GetEventUseCase(h.events),
      supplies: new ListSuppliesUseCase(h.supplies, h.events),
      boxes: new GetEventBoxesUseCase(h.events),
    };
  },
}));
vi.mock("@/presentation/movements/components/movement-list", () => ({
  MovementList: () => null,
}));
vi.mock("@/presentation/events/components/supply-list", () => ({
  SupplyList: () => null,
}));
function clientProps(
  node: ReactNode,
  component: unknown,
): Record<string, unknown> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = clientProps(child, component);
      if (found) return found;
    }
  } else if (isValidElement<{ children?: ReactNode }>(node)) {
    if (node.type === component) return node.props;
    return clientProps(node.props.children, component);
  }
}
it("páginas enviam metadados sem chaves privadas aos componentes cliente", async () => {
  const h = active();
  const box = await h.box();
  const m = await new CreateMovementUseCase(
    h.movements,
    h.boxes,
    h.receipts,
  ).execute(h.actor, movementInput(box.id), [pdf()]);
  const e = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    eventInput(box.id),
  );
  const s = await new CreateSupplyUseCase(
    h.supplies,
    h.events,
    h.boxes,
    h.receipts,
  ).execute(h.actor, e.id, supplyInput(null), [pdf()]);
  const { default: MovementsPage } =
    await import("@/app/(authenticated)/movimentacoes/page");
  const { MovementList } =
    await import("@/presentation/movements/components/movement-list");
  const movement = clientProps(
    await MovementsPage({ searchParams: Promise.resolve({ page: "1" }) }),
    MovementList,
  );
  expect(movement).toBeDefined();
  expect(movement?.items).toMatchObject([
    { id: m.id, receipts: [{ id: m.receipts[0].id, type: "application/pdf" }] },
  ]);
  expect(JSON.stringify(movement)).not.toContain(m.receipts[0].key);
  expect(JSON.stringify(movement)).not.toContain("fingerprint");
  const { default: SuppliesPage } =
    await import("@/app/(authenticated)/eventos/[id]/insumos/page");
  const { SupplyList } =
    await import("@/presentation/events/components/supply-list");
  const supplies = clientProps(
    await SuppliesPage({
      params: Promise.resolve({ id: e.id }),
      searchParams: Promise.resolve({ page: "1" }),
    }),
    SupplyList,
  );
  expect(supplies).toBeDefined();
  expect(supplies?.supplies).toMatchObject([
    { id: s.id, receipts: [{ id: s.receipts[0].id }] },
  ]);
  expect(JSON.stringify(supplies)).not.toContain(s.receipts[0].key);
  expect(JSON.stringify(supplies)).not.toContain("receiptKey");
  expect(JSON.stringify(supplies)).not.toContain("fingerprint");
});
