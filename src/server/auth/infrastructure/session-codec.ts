import { SESSION_DURATION_SECONDS } from "../models/session-rules";
import type { Session } from "../models/session.model";
import { sessionPayloadSchema } from "./session-payload.schema";
import {
  normalizeBirthDate,
  normalizePhoneField,
} from "@/server/users/models/profile-details";

const encode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const decode = (value: string) =>
  Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (char) =>
    char.charCodeAt(0),
  );

async function getKey(secret: string) {
  if (secret.length < 32)
    throw new Error("SESSION_SECRET ausente ou insuficiente");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(session: Session, secret: string) {
  const payload = encode(
    new TextEncoder().encode(JSON.stringify({ version: 2, ...session })),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getKey(secret),
    new TextEncoder().encode(payload),
  );
  return `${payload}.${encode(new Uint8Array(signature))}`;
}

export async function verifySession(
  value: string,
  secret: string,
  now = Date.now(),
): Promise<Session | null> {
  const key = await getKey(secret);
  try {
    if (value.length > 3800) return null;
    const parts = value.split(".");
    if (
      parts.length !== 2 ||
      !(await crypto.subtle.verify(
        "HMAC",
        key,
        decode(parts[1]),
        new TextEncoder().encode(parts[0]),
      ))
    )
      return null;
    const payload: unknown = JSON.parse(
      new TextDecoder().decode(decode(parts[0])),
    );
    const result = sessionPayloadSchema.safeParse(payload);
    if (!result.success) return null;
    const data = result.data;
    if (
      data.issuedAt > Math.floor(now / 1000) ||
      data.expiresAt <= data.issuedAt ||
      data.expiresAt > data.issuedAt + SESSION_DURATION_SECONDS ||
      data.expiresAt <= Math.floor(now / 1000)
    )
      return null;
    return {
      role: data.role,
      user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        birthDate: normalizeBirthDate(data.user.birthDate),
        phoneCountry: normalizePhoneField(data.user.phoneCountry),
        phoneNumber: normalizePhoneField(data.user.phoneNumber),
      },
      issuedAt: data.issuedAt,
      expiresAt: data.expiresAt,
    };
  } catch (cause) {
    // Only malformed encoding/JSON means an invalid cookie; crypto/runtime failures propagate.
    if (
      cause instanceof SyntaxError ||
      (cause instanceof DOMException && cause.name === "InvalidCharacterError")
    )
      return null;
    throw cause;
  }
}
