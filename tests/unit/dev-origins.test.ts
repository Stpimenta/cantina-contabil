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
  it("allows both loopback names and the local network without a wildcard", async () => {
    const config = await configure(PHASE_DEVELOPMENT_SERVER);
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
