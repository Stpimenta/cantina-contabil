import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({
  activate: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: fixtures.set, get: fixtures.get }),
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));
vi.mock("@/server/canteen/composition", () => ({
  createCanteen: () => ({ activate: { execute: fixtures.activate } }),
}));
vi.mock("@/server/canteen/infrastructure/http-identity", () => ({
  temporaryCookieName: "cantina-command-access",
}));
import { POST } from "@/app/command-access/activate/route";
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.activate.mockResolvedValue({
    credential: "synthetic-browser-credential",
    access: { eventId: "event-id", expiresAt: 2000000000 },
  });
});
describe("activation HTTP boundary", () => {
  it("activates from the browser-facing local host and sets the private cookie", async () => {
    const response = await POST(
      new Request("http://0.0.0.0:5174/command-access/activate", {
        method: "POST",
        headers: {
          Origin: "http://localhost:5174",
          Host: "localhost:5174",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret: "synthetic-link" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      value: { eventId: "event-id" },
    });
    expect(fixtures.activate).toHaveBeenCalledWith("synthetic-link", undefined);
    expect(fixtures.set).toHaveBeenCalledWith(
      "cantina-command-access",
      "synthetic-browser-credential",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      }),
    );
  });
  it("rejects a foreign origin with a readable Result and does not consume the link", async () => {
    const response = await POST(
      new Request("http://0.0.0.0:5174/command-access/activate", {
        method: "POST",
        headers: { Origin: "https://foreign.test", Host: "localhost:5174" },
        body: JSON.stringify({ secret: "synthetic-link" }),
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "ACCESS_DENIED", category: "forbidden" },
    });
    expect(fixtures.activate).not.toHaveBeenCalled();
    expect(fixtures.set).not.toHaveBeenCalled();
  });
});
