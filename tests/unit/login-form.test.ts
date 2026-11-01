import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/server/auth/composition", () => ({
  createAuth: vi.fn(() => {
    throw new Error("Session must not be read");
  }),
}));
vi.mock("@/server/auth/actions/login.action", () => ({ loginAction: vi.fn() }));
vi.mock("@/components/modals/error-modal", () => ({ ErrorModal: () => null }));
vi.mock("@/shared/hooks/use-server-action", () => ({
  useServerAction: () => ({
    execute: vi.fn(),
    pending: false,
    error: null,
    fields: {},
    closeError: vi.fn(),
  }),
}));

import LoginPage from "@/app/login/page";
import { createAuth } from "@/server/auth/composition";
import { LoginForm } from "@/presentation/auth/components/login-form";

describe("login before hydration", () => {
  it("uses POST to the clean login path and disables submission before JavaScript is ready", () => {
    const html = renderToStaticMarkup(createElement(LoginForm));
    const form = html.match(/<form\b[^>]*>/)?.[0];
    const submit = html.match(/<button\b[^>]*type="submit"[^>]*>/)?.[0];
    expect(form).toContain('method="post"');
    expect(form).toContain('action="/login"');
    expect(submit).toContain('disabled=""');
    expect(html).toContain('name="gmail"');
    expect(html).toContain('name="senha"');
  });
});

describe("login URL cleanup", () => {
  it.each(["gmail", "senha"])(
    "redirects a URL containing %s before reading the session",
    async (field) => {
      vi.mocked(createAuth).mockClear();
      await expect(
        LoginPage({ searchParams: Promise.resolve({ [field]: "synthetic" }) }),
      ).rejects.toThrow("redirect:/login");
      expect(createAuth).not.toHaveBeenCalled();
    },
  );
});
