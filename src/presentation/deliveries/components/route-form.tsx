"use client";
import { useId, useState } from "react";
import type { Driver } from "@/server/deliveries/models/driver.model";
import type { DeliveryOrder } from "@/server/deliveries/models/delivery-order.model";
import type { DeliveryPage } from "@/server/deliveries/models/delivery-page.model";
import type { RouteView } from "@/server/deliveries/models/route-view.model";
import { suggestAddressOrder } from "@/server/deliveries/models/suggest-address-order";
import { validateRoute } from "@/server/deliveries/inputs/delivery.input";
import { saveRouteAction } from "@/server/deliveries/actions/save-route.action";
import { listDeliveryCandidatesAction } from "@/server/deliveries/actions/list-delivery-candidates.action";
import { createRequestId } from "@/shared/identifiers/request-id";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { Field } from "@/components/ui/field";
import { FieldError } from "@/components/ui/field-error";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/modals/error-modal";
import { DeliveryForm } from "./delivery-form";
import { DeliveryAddress } from "./delivery-address";
import styles from "./deliveries.module.css";
export function RouteForm({
  eventId,
  route: initialValue,
  drivers,
  onClose,
}: {
  eventId: string;
  route?: RouteView;
  drivers: Driver[];
  onClose: () => void;
}) {
  const [route] = useState(initialValue);
  const id = useId(),
    [requestId] = useState(createRequestId),
    [routeId] = useState(() => route?.id ?? createRequestId()),
    [name, setName] = useState(route?.name ?? ""),
    [driverId, setDriverId] = useState(route?.driverId ?? ""),
    [orders, setOrders] = useState<DeliveryOrder[]>(route?.orders ?? []),
    [candidates, setCandidates] = useState<DeliveryPage<DeliveryOrder> | null>(
      null,
    );
  const lookup = useServerAction({
    connectionMessage: "Não foi possível carregar os pedidos.",
  });
  const input = {
    requestId,
    id: routeId,
    version: route?.version ?? 0,
    name,
    driverId,
    orderIds: orders.map((o) => o.id),
  };
  function load(page: number) {
    lookup.execute(
      () => listDeliveryCandidatesAction(eventId, { q: "", page }),
      setCandidates,
    );
  }
  function move(index: number, offset: number) {
    setOrders((previous) => {
      const next = previous.slice();
      [next[index], next[index + offset]] = [
        next[index + offset]!,
        next[index]!,
      ];
      return next;
    });
  }
  return (
    <DeliveryForm
      title={route ? "Editar rota" : "Montar rota"}
      dirty={
        name !== (route?.name ?? "") ||
        driverId !== (route?.driverId ?? "") ||
        JSON.stringify(input.orderIds) !== JSON.stringify(route?.orderIds ?? [])
      }
      input={input}
      validate={validateRoute}
      fieldIds={{
        name: `${id}-name`,
        driverId: `${id}-driver`,
        orderIds: `${id}-orders`,
      }}
      save={() => saveRouteAction(eventId, input)}
      onClose={onClose}
    >
      {(fields, pending) => (
        <>
          <Field
            id={`${id}-name`}
            label="Nome da rota"
            value={name}
            maxLength={100}
            disabled={pending}
            error={fields?.name}
            onChange={(e) => setName(e.target.value)}
          />
          <SelectField
            id={`${id}-driver`}
            label="Entregador"
            value={driverId}
            disabled={pending}
            error={fields?.driverId}
            onValueChange={setDriverId}
            options={[
              { value: "", label: "Selecione" },
              ...drivers.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <div className={styles.row}>
            <h3 id={`${id}-orders`} tabIndex={-1}>
              Ordem das entregas
            </h3>
            <Button
              type="button"
              variant="neutral"
              disabled={pending || orders.length < 2}
              onClick={() => setOrders(suggestAddressOrder(orders))}
            >
              Organizar por endereço
            </Button>
          </div>
          <p className="muted record-meta">
            Agrupa por cidade, bairro, rua e número. Não calcula distância; sem
            endereço mantém a posição manual.
          </p>
          <FieldError id={`${id}-orders-error`} error={fields?.orderIds} />
          <ol className="record-list">
            {orders.map((o, index) => (
              <li key={o.id} className={styles.stop}>
                <div className="stack-small">
                  <p className="record-title">
                    {index + 1}. {o.customerName}
                    {o.fulfilled ? " · Entregue" : ""}
                  </p>
                  <DeliveryAddress address={o.address} />
                  <div className={styles.controls}>
                    <Button
                      type="button"
                      variant="neutral"
                      disabled={pending || index === 0}
                      aria-label={`Subir ${o.customerName}`}
                      onClick={() => move(index, -1)}
                    >
                      Subir
                    </Button>
                    <Button
                      type="button"
                      variant="neutral"
                      disabled={pending || index === orders.length - 1}
                      aria-label={`Descer ${o.customerName}`}
                      onClick={() => move(index, 1)}
                    >
                      Descer
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={pending || o.fulfilled}
                      onClick={() =>
                        setOrders((all) =>
                          all.filter((item) => item.id !== o.id),
                        )
                      }
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {route?.orders
            .filter((o) => !orders.some((selected) => selected.id === o.id))
            .map((o) => (
              <div className={styles.row} key={o.id}>
                <p className={styles.content}>{o.customerName}</p>
                <Button
                  type="button"
                  variant="neutral"
                  disabled={pending}
                  onClick={() => setOrders((all) => [...all, o])}
                >
                  Recolocar na rota
                </Button>
              </div>
            ))}
          <div>
            <Button
              type="button"
              variant="neutral"
              busy={lookup.pending}
              disabled={pending}
              onClick={() => load(1)}
            >
              Selecionar pedidos sem rota
            </Button>
          </div>
          {candidates && (
            <section className="stack-small" aria-label="Pedidos disponíveis">
              <h3>Pedidos sem rota</h3>
              {candidates.items
                .filter((o) => !orders.some((selected) => selected.id === o.id))
                .map((o) => (
                  <div className={`record-row ${styles.row}`} key={o.id}>
                    <div className={styles.content}>
                      <p className="record-title">{o.customerName}</p>
                      <DeliveryAddress address={o.address} />
                    </div>
                    <Button
                      type="button"
                      variant="neutral"
                      disabled={pending || lookup.pending}
                      onClick={() => setOrders((all) => [...all, o])}
                    >
                      Adicionar
                    </Button>
                  </div>
                ))}
              {candidates.total === 0 && <p>Nenhum pedido disponível.</p>}
              <div className={styles.controls}>
                <Button
                  type="button"
                  variant="neutral"
                  disabled={pending || lookup.pending || candidates.page <= 1}
                  onClick={() => load(candidates.page - 1)}
                >
                  Anterior
                </Button>
                <span>
                  Página {candidates.page} de{" "}
                  {Math.max(
                    1,
                    Math.ceil(candidates.total / candidates.pageSize),
                  )}
                </span>
                <Button
                  type="button"
                  variant="neutral"
                  disabled={
                    pending ||
                    lookup.pending ||
                    candidates.page * candidates.pageSize >= candidates.total
                  }
                  onClick={() => load(candidates.page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </section>
          )}
          <ErrorModal error={lookup.error} onClose={lookup.closeError} />
        </>
      )}
    </DeliveryForm>
  );
}
