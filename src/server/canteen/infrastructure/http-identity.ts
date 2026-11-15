import "server-only";
import { cookies } from "next/headers";
import { createAuth } from "@/server/auth/composition";
import type { CommandIdentity } from "../models/command-actor.model";
export const temporaryCookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-cantina-command-access"
    : "cantina-command-access";
export async function commandIdentity(): Promise<CommandIdentity> {
  const credential = (await cookies()).get(temporaryCookieName)?.value;
  if (credential) return { kind: "access", credential };
  return { kind: "user", session: await createAuth().getSession.execute() };
}
