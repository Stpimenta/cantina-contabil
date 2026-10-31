import { expect, it } from "vitest";
import {
  ReleaseError,
  releaseFailure,
  releaseFailureMessage,
} from "../../scripts/release-error.mjs";
it.each(["UND_ERR_SOCKET", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"])(
  "exposes only recognized transport code %s and keeps the original exception intact",
  (code) => {
    const cause = Object.assign(new Error("private provider body"), { code });
    const error = new TypeError("token-private-payload", { cause });
    const result = releaseFailure(error);
    expect(result).toEqual({ code: "API_TRANSPORT_FAILED", detail: code });
    expect(releaseFailureMessage(result)).toBe(
      `API_TRANSPORT_FAILED (${code})`,
    );
    expect(JSON.stringify(result)).not.toMatch(/private|token|stack|cause/);
    expect(error.cause).toBe(cause);
  },
);
it("never serializes unexpected errors, unknown codes, stacks or provider data", () => {
  const error = Object.assign(new Error("private password"), {
    code: "private-code",
    cause: Object.assign(new Error("private token"), { code: "private-cause" }),
  });
  expect(releaseFailure(error)).toEqual({ code: "UNEXPECTED_ERROR" });
  expect(releaseFailureMessage(releaseFailure(error))).toBe("UNEXPECTED_ERROR");
});
it("does not expose invalid JSON contents", () =>
  expect(releaseFailure(new SyntaxError("private response body"))).toEqual({
    code: "INVALID_JSON_RESPONSE_OR_FILE",
  }));
it.each(["TimeoutError", "AbortError"])(
  "classifies %s without its raw message",
  (name) => {
    const error = Object.assign(new Error("private request"), { name });
    expect(releaseFailure(error)).toEqual({ code: "API_REQUEST_ABORTED" });
  },
);
it("preserves deliberately authored release-check messages", () =>
  expect(releaseFailure(new ReleaseError("Tag conflict"))).toEqual({
    code: "RELEASE_CHECK_FAILED",
    message: "Tag conflict",
  }));
it("separates local process/filesystem errors from API failures", () =>
  expect(
    releaseFailure(Object.assign(new Error("private path"), { code: "EPERM" })),
  ).toEqual({ code: "LOCAL_OPERATION_FAILED", detail: "EPERM" }));
