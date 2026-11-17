import { describe, expect, it } from "vitest";
import { session, uuid } from "../support/data";
import {
  canReadBox,
  canWriteBox,
  canReadEvent,
  canAlterEvent,
} from "@/shared/auth/access-policy";
import {
  checkAdminAccess,
  checkCashBoxWrite,
} from "@/shared/auth/check-cash-box-access";
import {
  validateInviteAccount,
  validateManageAccount,
} from "@/server/users/inputs/manage-account.input";
describe("política de acesso por recurso", () => {
  it("financeiro separa consulta, alteração e caixa não autorizado", () => {
    const a = uuid(),
      b = uuid(),
      s = {
        ...session(),
        role: "finance" as const,
        cashBoxIds: [a, b],
        cashBoxWriteIds: [b],
      };
    expect(canReadBox(s, a)).toBe(true);
    expect(canWriteBox(s, a)).toBe(false);
    expect(canWriteBox(s, b)).toBe(true);
    expect(canReadBox(s, uuid())).toBe(false);
    expect(() => checkAdminAccess(s)).toThrow("ACCESS_DENIED");
    expect(() => checkCashBoxWrite(s, a, b)).toThrow("ACCESS_DENIED");
  });
  it("operador com alteração em um evento não ganha outro evento nem acesso geral ao caixa", () => {
    const box = uuid(),
      a = { id: uuid(), cashBoxId: box },
      b = { id: uuid(), cashBoxId: box };
    const s = {
      ...session(),
      role: "operator" as const,
      eventIds: [a.id],
      eventWriteIds: [a.id],
      cashBoxIds: [box],
      cashBoxWriteIds: [box],
    };
    expect(canReadEvent(s, a)).toBe(true);
    expect(canAlterEvent(s, a)).toBe(true);
    expect(canReadEvent(s, b)).toBe(false);
    expect(canWriteBox(s, box)).toBe(false);
    expect(canReadBox(s, box)).toBe(false);
  });
  it("administrador tem acesso completo, operador sem grants não recebe permissão implícita", () => {
    const event = { id: uuid(), cashBoxId: uuid() };
    expect(canAlterEvent(session(), event)).toBe(true);
    expect(canReadEvent({ ...session(), role: "operator" }, event)).toBe(false);
  });
  it("convite aceita e-mail/perfil e recusa grants de alteração fora dos recursos autorizados", () => {
    const id = uuid(),
      draft = {
        email: "person@example.invalid",
        role: "finance",
        cashBoxIds: [id],
        cashBoxWriteIds: [id],
        eventIds: [],
        eventWriteIds: [],
      };
    expect(validateInviteAccount(draft).ok).toBe(true);
    expect(validateInviteAccount({ ...draft, cashBoxIds: [] }).ok).toBe(false);
    expect(
      validateManageAccount({ ...draft, id: 1, version: 1, blocked: false }).ok,
    ).toBe(true);
    expect(validateInviteAccount({ ...draft, email: "inválido" }).ok).toBe(
      false,
    );
  });
});
