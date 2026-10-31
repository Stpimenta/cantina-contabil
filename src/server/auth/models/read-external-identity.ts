import { z } from "zod";
import { throwBusinessError } from "@/shared/errors/business-error";
import { isAllowedRole, type Role } from "./role.model";
const sidClaim = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid";
const identityClaimsSchema = z.object({
  [sidClaim]: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine(
      (value) =>
        Number.isSafeInteger(value) && value > 0 && value <= 2147483647,
    ),
  exp: z.number().refine(Number.isSafeInteger),
  status: z.unknown().optional(),
});
// PENDENTE: a assinatura do JWT externo não é validada. Ver README.md.
// Esta função é usada somente no token recebido diretamente da API de login.
export function readExternalIdentity(
  token: string,
  now = Date.now(),
): {
  userId: number;
  role: Role;
  expiresAt: number;
} {
  const invalid = () =>
    throwBusinessError({
      code: "INVALID_AUTH_RESPONSE",
      category: "unauthenticated",
    });
  const parts = token.split(".");
  if (parts.length !== 3) return invalid();
  const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  let payload: unknown;
  try {
    payload = JSON.parse(atob(normalized));
  } catch (cause) {
    // Malformed token only; unrelated runtime errors must reach the central executor.
    if (
      cause instanceof SyntaxError ||
      (cause instanceof DOMException && cause.name === "InvalidCharacterError")
    )
      return invalid();
    throw cause;
  }
  const result = identityClaimsSchema.safeParse(payload);
  if (!result.success) return invalid();
  const claims = result.data;
  const userId = claims[sidClaim];
  if (claims.exp <= Math.floor(now / 1000)) return invalid();
  if (!isAllowedRole(claims.status))
    throwBusinessError({
      code: "LOGIN_ACCESS_DENIED",
      category: "forbidden",
    });
  return { userId, role: claims.status, expiresAt: claims.exp };
}
