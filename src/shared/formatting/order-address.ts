import type { OrderAddress } from "@/server/events/models/order-address.model";
export function formatOrderAddress(address: OrderAddress): string {
  return [
    `${address.street}, ${address.noNumber ? "s/n" : address.number}`,
    address.complement,
    address.neighborhood,
    `${address.city} - ${address.state}`,
    address.postalCode,
    address.reference,
  ]
    .filter(Boolean)
    .join(" · ");
}
export function orderMapsUrl(address: OrderAddress | null): string | null {
  if (
    !address?.street ||
    (!address.number && !address.noNumber) ||
    !address.neighborhood ||
    !address.city ||
    !address.state
  )
    return null;
  const query = [
    address.street,
    address.noNumber ? "" : address.number,
    address.neighborhood,
    address.city,
    address.state,
    address.postalCode,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
