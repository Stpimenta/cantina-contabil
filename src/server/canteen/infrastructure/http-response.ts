import type { Result } from "@/shared/errors/application-error";
export function commandResponse<T>(result: Result<T>) {
  const status = result.ok
    ? 200
    : (
        {
          validation: 400,
          unauthenticated: 401,
          forbidden: 403,
          not_found: 404,
          conflict: 409,
          unavailable: 503,
          unexpected: 500,
        } as const
      )[result.error.category];
  return Response.json(result, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
