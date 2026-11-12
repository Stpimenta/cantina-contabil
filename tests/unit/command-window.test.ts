import { describe, expect, it, vi } from "vitest";
import { reconcileCommandWindow } from "@/presentation/canteen/reconcile-command-window";
import { readCommandResult } from "@/presentation/canteen/command-transport";
import { commandResponseSchema } from "@/server/canteen/inputs/command-response.schema";
import type {
  Command,
  CommandPage,
} from "@/server/canteen/models/command.model";
import { uuid } from "../support/data";
const command = (name: string, version = 1): Command => ({
  id: uuid(),
  version,
  customerName: name,
  note: "",
  createdAt: "2026-11-12T12:00:00.000Z",
  collected: false,
  paid: false,
  items: [{ name: "Café", quantity: 1, icon: "bag" }],
});
const page = (items: Command[]): CommandPage => ({
  eventId: uuid(),
  eventName: "Cantina",
  items,
  total: 16,
  page: 1,
  pageSize: 15,
  query: "",
  collected: false,
});
describe("sincronização da janela de comandas", () => {
  it("retirada remove o pedido e busca somente o ID que passa a preencher a página", async () => {
    const first = command("Ana"),
      second = command("Bia"),
      next = command("Caio"),
      load = vi.fn(async () => next);
    const value = await reconcileCommandWindow(
      page([first, second]),
      {
        order: { ...first, version: 2, collected: true },
        window: { ids: [second.id, next.id], total: 15, page: 1 },
      },
      load,
    );
    expect(value.items).toEqual([second, next]);
    expect(value.total).toBe(15);
    expect(load).toHaveBeenCalledExactlyOnceWith(next.id);
  });
  it("edição atualiza só o pedido e mantém ordem, demais objetos e seleção", async () => {
    const first = command("Ana"),
      second = command("Bia"),
      load = vi.fn();
    const value = await reconcileCommandWindow(
      { ...page([first, second]), query: "a" },
      {
        order: { ...first, version: 2, note: "Sem açúcar" },
        window: { ids: [first.id, second.id], total: 2, page: 1 },
      },
      load,
    );
    expect(value.items[0]).toMatchObject({ version: 2, note: "Sem açúcar" });
    expect(value.items[1]).toBe(second);
    expect(value.query).toBe("a");
    expect(load).not.toHaveBeenCalled();
  });
  it("janela vazia/clamp não inventa registro e dados antigos não sobrescrevem versão nova", async () => {
    const first = command("Ana", 3),
      load = vi.fn();
    const value = await reconcileCommandWindow(
      page([first]),
      {
        order: { ...first, version: 2 },
        window: { ids: [first.id], total: 1, page: 1 },
      },
      load,
    );
    expect(value.items[0].version).toBe(3);
    const empty = await reconcileCommandWindow(
      { ...value, page: 2 },
      { order: null, window: { ids: [], total: 0, page: 1 } },
      load,
    );
    expect(empty.items).toEqual([]);
    expect(empty.page).toBe(1);
    expect(empty.total).toBe(0);
  });
  it("rejeita contrato de API inválido e preserva encerramento técnico sem mensagem bruta", async () => {
    await expect(
      readCommandResult(
        Response.json({ ok: true, value: { token: "unexpected" } }),
        commandResponseSchema,
      ),
    ).rejects.toThrow("INVALID_COMMAND_RESPONSE");
    expect(
      await readCommandResult(
        Response.json({
          ok: false,
          error: {
            code: "TEMP_ACCESS_ENDED",
            category: "unauthenticated",
            message: "Sua sessão foi encerrada",
          },
        }),
        commandResponseSchema,
      ),
    ).toMatchObject({ ok: false, error: { code: "TEMP_ACCESS_ENDED" } });
  });
});
