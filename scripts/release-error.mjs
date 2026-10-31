// Only locally authored messages and allowlisted codes may leave this boundary.
// Never serialize provider payloads, raw errors, stacks, headers or credentials.
export class ReleaseError extends Error {}
const transportCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);
export function releaseFailure(error) {
  if (error instanceof ReleaseError)
    return { code: "RELEASE_CHECK_FAILED", message: error.message };
  const causeCode =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.code
      : undefined;
  if (error instanceof TypeError && transportCodes.has(causeCode))
    return { code: "API_TRANSPORT_FAILED", detail: causeCode };
  if (
    error instanceof Error &&
    ["TimeoutError", "AbortError"].includes(error.name)
  )
    return { code: "API_REQUEST_ABORTED" };
  if (error instanceof SyntaxError)
    return { code: "INVALID_JSON_RESPONSE_OR_FILE" };
  if (
    error instanceof Error &&
    ["EPERM", "EACCES", "ENOENT", "ENOSPC"].includes(error.code)
  )
    return { code: "LOCAL_OPERATION_FAILED", detail: error.code };
  return { code: "UNEXPECTED_ERROR" };
}
export function releaseFailureMessage(failure) {
  return `${failure.code}${failure.detail ? ` (${failure.detail})` : ""}${failure.message ? `: ${failure.message}` : ""}`;
}
