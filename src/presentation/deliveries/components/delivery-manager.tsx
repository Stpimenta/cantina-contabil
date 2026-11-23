"use client";
import { useState } from "react";
import type { ListDeliveriesUseCase } from "@/server/deliveries/use-cases/list-deliveries.use-case";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Modal } from "@/components/modals/modal";
import { DriverForm } from "./driver-form";
import { DeliverySettingsForm } from "./delivery-settings-form";
import { RouteForm } from "./route-form";
import { DeliveryRouteList } from "./delivery-route-list";
import { DeliveryAccesses } from "./delivery-accesses";
import { DeliveryAddress } from "./delivery-address";
import styles from "./deliveries.module.css";
type Board = Awaited<ReturnType<ListDeliveriesUseCase["execute"]>>;
export function DeliveryManager({ board }: { board: Board }) {
  const [settings, setSettings] = useState(false),
    [driverManager, setDriverManager] = useState(false),
    [editingDriver, setEditingDriver] = useState<string | null>(null),
    [editingRoute, setEditingRoute] = useState<string | null>(null);
  const participants = board.drivers.filter((d) =>
    board.settings?.driverIds.includes(d.id),
  );
  return (
    <div className="stack">
      {board.writable && (
        <div className={styles.controls}>
          <Button
            onClick={() => setEditingRoute("new")}
            disabled={!board.settings || !participants.length}
          >
            Montar rota
          </Button>
          <Button variant="neutral" onClick={() => setSettings(true)}>
            Ponto de saída e equipe
          </Button>
          <Button variant="neutral" onClick={() => setDriverManager(true)}>
            Entregadores
          </Button>
          <DeliveryAccesses
            eventId={board.eventId}
            drivers={participants}
            accesses={board.accesses}
          />
        </div>
      )}
      {board.settings && (
        <section className="stack-small">
          <h2>Ponto de saída</h2>
          <DeliveryAddress address={board.settings.origin} />
        </section>
      )}
      {!board.settings && (
        <p>
          Defina o ponto de saída e selecione os entregadores do evento para
          montar as rotas.
        </p>
      )}
      <DeliveryRouteList
        eventId={board.eventId}
        routes={board.routes.items}
        drivers={board.drivers}
        writable={board.writable}
        onEdit={setEditingRoute}
        options={board.routeOptions}
      />
      <Pagination
        basePath={`/events/${board.eventId}/deliveries`}
        {...board.routes}
      />
      {settings && (
        <DeliverySettingsForm
          eventId={board.eventId}
          settings={board.settings}
          drivers={board.drivers}
          onClose={() => setSettings(false)}
        />
      )}
      {driverManager && (
        <Modal
          open
          title="Cadastro de entregadores"
          size="wide"
          onClose={() => setDriverManager(false)}
          footer={
            <Button variant="danger" onClick={() => setDriverManager(false)}>
              Fechar
            </Button>
          }
        >
          <div className="stack">
            <div>
              <Button onClick={() => setEditingDriver("new")}>
                Cadastrar entregador
              </Button>
            </div>
            <ul className="record-list">
              {board.drivers.map((d) => (
                <li className="record-row" key={d.id}>
                  <div className="stack-small">
                    <p className="record-title">{d.name}</p>
                    {d.phone && <p>{d.phone}</p>}
                  </div>
                  <Button
                    variant="neutral"
                    onClick={() => setEditingDriver(d.id)}
                  >
                    Editar
                  </Button>
                </li>
              ))}
            </ul>
            {!board.drivers.length && <p>Nenhum entregador cadastrado.</p>}
          </div>
        </Modal>
      )}
      {editingDriver && (
        <DriverForm
          eventId={board.eventId}
          driver={board.drivers.find((d) => d.id === editingDriver)}
          onClose={() => setEditingDriver(null)}
        />
      )}
      {editingRoute && (
        <RouteForm
          eventId={board.eventId}
          drivers={participants}
          route={board.routes.items.find((r) => r.id === editingRoute)}
          onClose={() => setEditingRoute(null)}
        />
      )}
    </div>
  );
}
