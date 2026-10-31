import { expect, it, vi } from "vitest";
import { z } from "zod";
import { requestJson } from "../../scripts/ci-api.mjs";
const url = "https://api.github.com/repos/synthetic/project/git/ref/heads/main";
const schema = z.object({ value: z.string() });
const socketError = (code = "UND_ERR_SOCKET") =>
  new TypeError("synthetic transport failure", {
    cause: Object.assign(new Error("synthetic socket"), { code }),
  });
it.each(["UND_ERR_SOCKET", "ECONNRESET"])(
  "recovers a GET from %s with one fresh attempt",
  async (code) => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(socketError(code))
      .mockResolvedValueOnce(Response.json({ value: "current-main" }));
    expect(
      await requestJson(url, "synthetic-token", schema, {}, request),
    ).toEqual({ value: "current-main" });
    expect(request).toHaveBeenCalledTimes(2);
    const [first, second] = request.mock.calls.map((call) => call[1]);
    expect(first.headers.Connection).toBe("close");
    expect(second.headers.Connection).toBe("close");
    expect(second.signal).not.toBe(first.signal);
  },
);
it("does not keep retrying when the second socket also fails", async () => {
  const second = socketError();
  const request = vi
    .fn()
    .mockRejectedValueOnce(socketError())
    .mockRejectedValueOnce(second)
    .mockResolvedValueOnce(
      Response.json({ value: "unreachable-third-attempt" }),
    );
  await expect(
    requestJson(url, "synthetic-token", schema, {}, request),
  ).rejects.toBe(second);
  expect(request).toHaveBeenCalledTimes(2);
});
it.each(["POST", "PATCH", "DELETE"])(
  "never automatically repeats %s, including an uncertain write",
  async (method) => {
    const error = socketError();
    const request = vi.fn().mockRejectedValue(error);
    await expect(
      requestJson(
        url,
        "synthetic-token",
        schema,
        { method, body: { value: "synthetic" } },
        request,
      ),
    ).rejects.toBe(error);
    expect(request).toHaveBeenCalledOnce();
  },
);
it.each([401, 403, 429, 500])(
  "does not retry an HTTP %s response",
  async (status) => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response("private provider response", { status }));
    await expect(
      requestJson(url, "synthetic-token", schema, {}, request),
    ).rejects.toThrow(`HTTP ${status}`);
    expect(request).toHaveBeenCalledOnce();
  },
);
it("does not retry unrelated transport/runtime failures", async () => {
  const error = socketError("ENOTFOUND");
  const request = vi.fn().mockRejectedValue(error);
  await expect(
    requestJson(url, "synthetic-token", schema, {}, request),
  ).rejects.toBe(error);
  expect(request).toHaveBeenCalledOnce();
});
it("does not retry invalid JSON or a rejected response contract", async () => {
  for (const response of [
    new Response("invalid-json"),
    Response.json({ invalid: "contract" }),
  ]) {
    const request = vi.fn().mockResolvedValue(response);
    await expect(
      requestJson(url, "synthetic-token", schema, {}, request),
    ).rejects.toThrow();
    expect(request).toHaveBeenCalledOnce();
  }
});
