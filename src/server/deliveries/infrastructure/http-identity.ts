import "server-only";
import { cookies } from "next/headers";
export const deliveryCookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-cantina-delivery-access"
    : "cantina-delivery-access";
export async function deliveryCredential() {
  return (await cookies()).get(deliveryCookieName)?.value;
}
