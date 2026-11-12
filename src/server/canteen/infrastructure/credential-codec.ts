import type { CredentialCodec } from "../repositories/canteen.repository";
export const credentialCodec: CredentialCodec = {
  random: () =>
    Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join(""),
  async hash(value) {
    return Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
      ),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
  },
};
