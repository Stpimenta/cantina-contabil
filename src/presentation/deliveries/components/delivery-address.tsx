import type { OrderAddress } from "@/server/events/models/order-address.model";
import { orderMapsUrl } from "@/shared/formatting/order-address";
import { buttonClassName } from "@/components/ui/button";
import styles from "./deliveries.module.css";
export function addressText(a: OrderAddress | null) {
  return a
    ? [
        a.street,
        a.noNumber ? "s/n" : a.number,
        a.neighborhood,
        `${a.city}/${a.state}`,
        a.postalCode,
      ]
        .filter(Boolean)
        .join(", ")
    : "Endereço não informado";
}
export function DeliveryAddress({
  address,
  navigation = false,
}: {
  address: OrderAddress | null;
  navigation?: boolean;
}) {
  return (
    <div className="stack-small">
      <p className={styles.address}>{addressText(address)}</p>
      {address?.complement && <p>{address.complement}</p>}
      {address?.reference && <p className="muted">{address.reference}</p>}
      {navigation && address?.street && (
        <div>
          <a
            href={orderMapsUrl(address)!}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName({ variant: "neutral" })}
          >
            Abrir no mapa
          </a>
        </div>
      )}
    </div>
  );
}
