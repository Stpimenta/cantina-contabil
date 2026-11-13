import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { describe, expect, it, vi } from "vitest";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";

vi.mock("@opennextjs/cloudflare", () => ({
  initOpenNextCloudflareForDev: vi.fn(),
}));
vi.mock("node:os", () => ({
  networkInterfaces: () => ({
    lo: [{ family: "IPv4", internal: true, address: "127.0.0.1" }],
    lan: [{ family: "IPv4", internal: false, address: "192.0.2.10" }],
  }),
}));

import configure from "../../next.config";

describe("development origins", () => {
  it("uses English public routes and keeps redirects for existing links", async () => {
    const config = await configure(PHASE_DEVELOPMENT_SERVER);
    expect(await config.rewrites?.()).toContainEqual({
      source: "/api/events/:id/commands/socket",
      destination: "http://127.0.0.1:8787/api/events/:id/commands/socket",
    });
    expect(await config.redirects?.()).toEqual(
      expect.arrayContaining([
        {
          source: "/acesso-comandas",
          destination: "/command-access",
          permanent: false,
        },
        {
          source: "/eventos/:id/pedidos",
          destination: "/events/:id/orders",
          permanent: false,
        },
      ]),
    );
  });
  it("allows both loopback names and the local network without a wildcard", async () => {
    const config = await configure(PHASE_DEVELOPMENT_SERVER);
    expect(initOpenNextCloudflareForDev).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: "next",
        remoteBindings: false,
      }),
    );
    expect(config.allowedDevOrigins).toEqual([
      "localhost",
      "127.0.0.1",
      "192.0.2.10",
    ]);
    expect(config.allowedDevOrigins).not.toContain("*");
  });

  it("does not add development origins to production", async () => {
    expect(
      (await configure(PHASE_PRODUCTION_BUILD)).allowedDevOrigins,
    ).toBeUndefined();
  });
});
