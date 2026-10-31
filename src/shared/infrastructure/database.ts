import "server-only";
import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { InfrastructureError } from "@/shared/errors/infrastructure-error";

export function createDatabase() {
  const db = (getCloudflareContext().env as unknown as { DB?: D1Database }).DB;
  if (!db) throw new InfrastructureError("Binding DB ausente", "d1");
  return drizzle(db);
}
export type Database = ReturnType<typeof createDatabase>;
