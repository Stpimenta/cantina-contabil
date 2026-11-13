import { describe, expect, it } from "vitest";
import { isActivationOriginAllowed } from "@/server/canteen/infrastructure/activation-origin";

const request = (url: string, origin?: string, host?: string) =>
  new Request(url, {
    method: "POST",
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(host ? { Host: host } : {}),
    },
  });
describe("temporary activation origin", () => {
  it.each(["localhost:5174", "127.0.0.1:5174", "192.168.1.20:5174"])(
    "accepts browser Host %s despite Next's internal listening URL",
    (host) => {
      expect(
        isActivationOriginAllowed(
          request(
            "http://0.0.0.0:5174/command-access/activate",
            `http://${host}`,
            host,
          ),
          false,
        ),
      ).toBe(true);
    },
  );
  it("accepts the public same-origin URL in production", () => {
    expect(
      isActivationOriginAllowed(
        request("https://app.test/command-access/activate", "https://app.test"),
        true,
      ),
    ).toBe(true);
  });
  it.each([
    undefined,
    "null",
    "https://evil.test",
    "http://localhost:5175",
    "https://localhost:5174",
    "http://localhost:5174/path",
  ])("rejects missing, foreign or malformed origin %s", (origin) => {
    expect(
      isActivationOriginAllowed(
        request(
          "http://0.0.0.0:5174/command-access/activate",
          origin,
          "localhost:5174",
        ),
        false,
      ),
    ).toBe(false);
  });
  it("never trusts Host or forwarding headers to bypass the production URL", () => {
    const req = request(
      "https://app.test/command-access/activate",
      "https://evil.test",
      "evil.test",
    );
    req.headers.set("x-forwarded-host", "evil.test");
    expect(isActivationOriginAllowed(req, true)).toBe(false);
  });
});
