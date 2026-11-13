import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const lifecycle = vi.hoisted(() => {
  const state = {
    effects: [] as Array<() => void>,
    secret: null as string | null,
    captured: { current: false },
    setSecret: vi.fn((value: string | null) => {
      state.secret = value;
    }),
  };
  return state;
});
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => void) => {
    lifecycle.effects.push(effect);
  },
  useRef: () => lifecycle.captured,
  useState: () => [lifecycle.secret, lifecycle.setSecret],
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/shared/hooks/use-server-action", () => ({
  useServerAction: () => ({
    execute: vi.fn(),
    pending: false,
    error: null,
    closeError: vi.fn(),
  }),
}));
vi.mock("@/components/modals/error-modal", () => ({ ErrorModal: () => null }));
import { ActivateAccess } from "@/presentation/canteen/components/activate-access";

beforeEach(() => {
  lifecycle.secret = null;
  lifecycle.captured.current = false;
  lifecycle.effects.length = 0;
  lifecycle.setSecret.mockClear();
});
describe("temporary access activation link", () => {
  it("keeps activation available when development replays the URL-cleaning effect", () => {
    const secret = "a".repeat(64);
    const location = { hash: `#chave=${secret}`, pathname: "/command-access" };
    const clean = vi.fn(() => {
      location.hash = "";
    });
    vi.stubGlobal("location", location);
    vi.stubGlobal("history", { replaceState: clean });
    renderToStaticMarkup(createElement(ActivateAccess));
    const capture = lifecycle.effects[0];
    capture();
    capture(); // Strict Mode replays setup after cleanup on the same mounted component.
    const html = renderToStaticMarkup(createElement(ActivateAccess));
    expect(location.hash).toBe("");
    expect(clean).toHaveBeenCalledWith(null, "", "/command-access");
    expect(lifecycle.secret).toBe(secret);
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("Abra o link fornecido");
    expect(html).not.toContain(secret);
  });
  it("keeps activation disabled when the supplied URL has no key", () => {
    vi.stubGlobal("location", { hash: "", pathname: "/command-access" });
    vi.stubGlobal("history", { replaceState: vi.fn() });
    renderToStaticMarkup(createElement(ActivateAccess));
    lifecycle.effects[0]();
    const html = renderToStaticMarkup(createElement(ActivateAccess));
    expect(html).toContain('disabled=""');
    expect(html).toContain("Abra o link fornecido pelo responsável.");
  });
});
