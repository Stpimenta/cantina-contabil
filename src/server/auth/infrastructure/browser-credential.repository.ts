import "server-only";
import { cookies } from "next/headers";
import type { BrowserCredentialRepository } from "../repositories/browser-credential.repository";
export const accountCookieName = (production: boolean) =>
  production ? "__Host-cantina-account" : "cantina-account";
export class CookieAccountCredentialRepository implements BrowserCredentialRepository {
  constructor(private readonly purpose: "session" | "setup" = "session") {}
  private get name() {
    return (
      accountCookieName(process.env.APP_ENV === "production") +
      (this.purpose === "setup" ? "-setup" : "")
    );
  }
  async read() {
    return (await cookies()).get(this.name)?.value ?? null;
  }
  async write(value: string) {
    // Browser-session cookie; persistent authorization expires by inactivity in D1.
    (await cookies()).set(this.name, value, {
      httpOnly: true,
      secure: process.env.APP_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }
  async clear() {
    (await cookies()).set(this.name, "", {
      httpOnly: true,
      secure: process.env.APP_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}
