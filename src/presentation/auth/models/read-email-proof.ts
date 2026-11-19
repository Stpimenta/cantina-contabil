import { validateEmailProof } from "@/server/auth/inputs/account-enrollment.input";

// Parsing alone never verifies or consumes the provider's proof.
export function readEmailProof(href: string) {
  const url = new URL(href);
  for (const params of [
    new URLSearchParams(url.hash.slice(1)),
    url.searchParams,
  ]) {
    const result = validateEmailProof({
      tokenHash: params.get("token_hash"),
      type: params.get("type"),
    });
    if (result.ok) return result.value;
  }
  return null;
}
