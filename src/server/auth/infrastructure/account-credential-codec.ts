import { z } from "zod";
import type { AccountTokens } from "../models/account-tokens.model";
import type { AccountCredentialRepository } from "../repositories/account-credential.repository";
import { InfrastructureError } from "@/shared/errors/infrastructure-error";
const encode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
const decode = (value: string) =>
  Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
    c.charCodeAt(0),
  );
export class AccountCredentialCodec implements AccountCredentialRepository {
  constructor(private readonly secret: string) {}
  generate() {
    return encode(crypto.getRandomValues(new Uint8Array(32)));
  }
  async hash(value: string) {
    return encode(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
      ),
    );
  }
  private async key() {
    if (this.secret.length < 32)
      throw new InfrastructureError(
        "Configuração de sessão ausente",
        "account-session",
      );
    const raw = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`cantina-account-tokens-v1:${this.secret}`),
    );
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
  }
  async seal(value: AccountTokens) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode("account-session-v1"),
      },
      await this.key(),
      new TextEncoder().encode(JSON.stringify(value)),
    );
    return `v1.${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
  }
  async open(value: string) {
    const [version, iv, body, ...extra] = value.split(".");
    if (version !== "v1" || !iv || !body || extra.length)
      throw new InfrastructureError(
        "Formato de sessão inválido",
        "account-session",
      );
    const plain = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: decode(iv),
        additionalData: new TextEncoder().encode("account-session-v1"),
      },
      await this.key(),
      decode(body),
    );
    const schema = z.object({
      accessToken: z.string().min(1),
      refreshToken: z.string().min(1),
      expiresIn: z.number().int().positive(),
      identity: z.object({
        subject: z.uuid(),
        email: z.email(),
        emailConfirmed: z.boolean(),
      }),
    });
    const parsed = schema.safeParse(
      JSON.parse(new TextDecoder().decode(plain)),
    );
    if (!parsed.success)
      throw new InfrastructureError(
        "Contrato de sessão inválido",
        "account-session",
      );
    return parsed.data;
  }
}
