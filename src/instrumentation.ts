export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routePath: string; routeType: string },
) {
  const { logFailure } = await import("./shared/logging/logger");
  const digest =
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : crypto.randomUUID();
  logFailure("next.request", digest, error, {
    source: "src/instrumentation.ts",
    route: context.routePath,
    method: request.method,
    routeType: context.routeType,
  });
}
