import type { PostalAddress } from "@/server/addresses/models/postal-address.model";
// Preserve edits made while the lookup was in flight, and fields not supplied by the provider.
export function mergePostalAddress<T extends PostalAddress>(
  current: T,
  before: T,
  found: PostalAddress,
): T {
  if (current.postalCode.replace("-", "") !== found.postalCode) return current;
  const next = { ...current };
  for (const key of ["street", "neighborhood", "city", "state"] as const) {
    if (current[key] === before[key] && found[key]) next[key] = found[key];
  }
  return next;
}
