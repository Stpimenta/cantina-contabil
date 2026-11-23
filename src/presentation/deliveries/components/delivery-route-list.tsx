"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeliveryRoute } from "@/server/deliveries/models/delivery-route.model";
import type { DeliveryOrder } from "@/server/deliveries/models/delivery-order.model";
import { routeState } from "@/server/deliveries/models/route-state";
import { deliverOrderAction } from "@/server/deliveries/actions/deliver-order.action";
import { startRouteAction } from "@/server/deliveries/actions/start-route.action";
import { cancelRouteAction } from "@/server/deliveries/actions/cancel-route.action";
import { createRequestId } from "@/shared/identifiers/request-id";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { SectionFeedback } from "@/components/ui/section-feedback";
import { ErrorModal } from "@/components/modals/error-modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { DeliveryAddress } from "./delivery-address";
import { MoveDeliveryForm } from "./move-delivery-form";
import styles from "./deliveries.module.css";
export type DisplayRoute = Pick<
  DeliveryRoute,
  "id" | "name" | "driverId" | "startedAt" | "version"
> & { orders: DeliveryOrder[] };
export function DeliveryRouteList({
  eventId,
  routes,
  temporary = false,
  writable = false,
  drivers = [],
  onEdit,
  options = [],
}: {
  eventId: string;
  routes: DisplayRoute[];
  temporary?: boolean;
  writable?: boolean;
  drivers?: { id: string; name: string }[];
  onEdit?: (id: string) => void;
  options?: Pick<DeliveryRoute, "id" | "name" | "version">[];
}) {
  const router = useRouter(),
    toast = useToast(),
    [cancel, setCancel] = useState<DisplayRoute | null>(null),
    [moving, setMoving] = useState<{
      route: DisplayRoute;
      orderId: string;
    } | null>(null);
  const { execute, pending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a alteração. Atualize as rotas antes de repetir.",
  });
  function finish() {
    setCancel(null);
    toast("Rota atualizada.");
    router.refresh();
  }
  const states = {
    ready: "Preparada",
    started: "Em andamento",
    completed: "Concluída",
  };
  if (!routes.length)
    return (
      <SectionFeedback area="pedidos">Nenhuma rota encontrada.</SectionFeedback>
    );
  return (
    <>
      <div className="stack">
        {routes.map((route) => (
          <section
            key={route.id}
            className={styles.section}
            aria-label={route.name}
          >
            <div className={styles.row}>
              <div className={styles.content}>
                <h2>{route.name}</h2>
                <p className="muted">
                  {states[routeState(route)]} ·{" "}
                  {route.orders.filter((o) => o.fulfilled).length}/
                  {route.orders.length} entregas
                </p>
                {!temporary && (
                  <p>{drivers.find((d) => d.id === route.driverId)?.name}</p>
                )}
              </div>
              {writable && (
                <div className={styles.controls}>
                  {routeState(route) === "ready" && (
                    <Button
                      variant="neutral"
                      disabled={pending}
                      onClick={() =>
                        execute(
                          () =>
                            startRouteAction(eventId, route.id, {
                              requestId: createRequestId(),
                              version: route.version,
                            }),
                          finish,
                        )
                      }
                    >
                      Iniciar rota
                    </Button>
                  )}
                  <Button
                    variant="neutral"
                    disabled={pending}
                    onClick={() => onEdit?.(route.id)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    disabled={pending || route.orders.some((o) => o.fulfilled)}
                    onClick={() => setCancel(route)}
                  >
                    Cancelar rota
                  </Button>
                </div>
              )}
            </div>
            <ol className="record-list">
              {route.orders.map((o, index) => (
                <li key={o.id} className={styles.stop}>
                  <div className="stack-small">
                    <div className={styles.row}>
                      <p className="record-title">
                        {index + 1}. {o.customerName}
                      </p>
                      <span>{o.fulfilled ? "Entregue" : "A entregar"}</span>
                    </div>
                    <p>
                      {o.items
                        .map((i) => `${i.quantity}× ${i.name}`)
                        .join(" · ")}
                    </p>
                    {o.note && <p className="preserve-lines">{o.note}</p>}
                    <DeliveryAddress address={o.address} navigation />
                    {o.contactPhone && (
                      <a
                        className="text-link"
                        href={`tel:+55${o.contactPhone}`}
                      >
                        {o.contactPhone}
                      </a>
                    )}
                    <div className={styles.controls}>
                      {(temporary || writable) && (
                        <Button
                          variant={o.fulfilled ? "neutral" : "primary"}
                          disabled={pending}
                          onClick={() =>
                            execute(
                              () =>
                                deliverOrderAction(
                                  eventId,
                                  o.id,
                                  {
                                    requestId: createRequestId(),
                                    routeId: route.id,
                                    version: o.version,
                                    fulfilled: !o.fulfilled,
                                  },
                                  temporary,
                                ),
                              () => {
                                toast(
                                  o.fulfilled
                                    ? "Entrega desfeita."
                                    : "Entrega confirmada.",
                                );
                                router.refresh();
                              },
                            )
                          }
                        >
                          {o.fulfilled ? "Desfazer entrega" : "Marcar entregue"}
                        </Button>
                      )}
                      {writable && !o.fulfilled && (
                        <Button
                          variant="neutral"
                          disabled={pending || options.length < 2}
                          onClick={() => setMoving({ route, orderId: o.id })}
                        >
                          Mover para outra rota
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <ErrorModal error={error} onClose={closeError} />
      {cancel && (
        <ConfirmationModal
          title="Cancelar rota?"
          message="Os pedidos voltarão a ficar disponíveis para montar outra rota. O histórico será preservado."
          confirmLabel="Cancelar rota"
          busy={pending}
          onCancel={() => setCancel(null)}
          onConfirm={() =>
            execute(
              () =>
                cancelRouteAction(eventId, cancel.id, {
                  requestId: createRequestId(),
                  version: cancel.version,
                }),
              finish,
            )
          }
        />
      )}
      {moving && (
        <MoveDeliveryForm
          eventId={eventId}
          from={moving.route}
          orderId={moving.orderId}
          options={options}
          onClose={() => setMoving(null)}
        />
      )}
    </>
  );
}
