import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export function EventOrders({ eventId }: { eventId: string }) {
  return (
    <Link
      href={`/eventos/${eventId}/pedidos`}
      className={buttonClassName({
        size: "large",
        compactOnMobile: true,
        className: "wide-action",
        variant: "primary",
      })}
    >
      Pedidos
    </Link>
  );
}
