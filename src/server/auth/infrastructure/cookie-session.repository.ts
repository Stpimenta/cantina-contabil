import "server-only";
import { cookies } from "next/headers";
import type { Session } from "../models/session.model";
import type { SessionRepository } from "../repositories/session.repository";
import { signSession, verifySession } from "./session-codec";

export class CookieSessionRepository implements SessionRepository {
  private readonly name =
    process.env.NODE_ENV === "production"
      ? "__Host-cantina-session"
      : "cantina-session";
  private get secret() {
    return process.env.SESSION_SECRET ?? "";
  }

  async read() {
    const value = (await cookies()).get(this.name)?.value;
    return value ? verifySession(value, this.secret) : null;
  }
  async create(session: Session) {
    const value = await signSession(session, this.secret);
    if (value.length > 3800)
      throw new Error("Sessão excede o limite de tamanho");
    (await cookies()).set(this.name, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(session.expiresAt * 1000),
    });
  }
  async destroy() {
    (await cookies()).set(this.name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
  }
}
