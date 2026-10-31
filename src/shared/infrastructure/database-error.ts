import { DrizzleQueryError } from "drizzle-orm/errors";

// Drizzle wraps provider errors. Inspect the bounded cause chain for known constraints.
export function hasDatabaseError(error: unknown, marker: string): boolean {
  let current = error;
  for (let depth = 0; depth <= 5 && current instanceof Error; depth++) {
    if (
      !(current instanceof DrizzleQueryError) &&
      current.message.includes(marker)
    )
      return true;
    current = current.cause;
  }
  return false;
}
