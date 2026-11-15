"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { useRouter } from "next/navigation";
import type {
  Command,
  CommandPage,
} from "@/server/canteen/models/command.model";
import { z } from "zod";
import {
  commandResponseSchema,
  commandPageSchema,
  commandWindowSchema,
} from "@/server/canteen/inputs/command-response.schema";
import { readCommandResult, commandNoticeSchema } from "../command-transport";
import {
  reconcileCommandWindow,
  type WindowChange,
} from "../reconcile-command-window";
import { collectCommandAction } from "@/server/canteen/actions/collect-command.action";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/ui/search-form";
import { CommandFilters } from "./command-filters";
import { Pagination } from "@/components/ui/pagination";
import { SectionFeedback } from "@/components/ui/section-feedback";
import { ErrorModal } from "@/components/modals/error-modal";
import styles from "./command-board.module.css";
export function CommandBoard({
  initial,
  basePath,
}: {
  initial: CommandPage;
  basePath: string;
}) {
  const [data, setData] = useState(initial),
    [connection, setConnection] = useState<
      "syncing" | "connected" | "offline" | "ended"
    >("syncing");
  const [interrupted, setInterrupted] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const refreshRef = useRef<(id: string, version: number) => Promise<void>>(
    async () => {},
  );
  const router = useRouter();
  const { execute, pending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a retirada. Aguarde a sincronização.",
    onServerError: (e) => {
      if (e.category === "unauthenticated") setConnection("ended");
    },
  });
  useEffect(() => {
    let disposed = false,
      socket: WebSocket | undefined,
      retry: ReturnType<typeof setTimeout> | undefined,
      attempt = 0,
      ended = false;
    const controller = new AbortController(),
      seen = new Map<string, number>();
    let chain = Promise.resolve(),
      ready = false,
      generation = 0;
    const queue: { id: string; version: number }[] = [];
    const params = new URLSearchParams({
      q: initial.query,
      page: String(initial.page),
      collected: initial.collected,
    });
    async function read<T>(url: string, schema: z.ZodType<T>): Promise<T> {
      const response = await fetch(url, {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(12000),
          ]),
          cache: "no-store",
        }),
        result = await readCommandResult(response, schema);
      if (!result.ok) {
        if (
          result.error.category === "unauthenticated" ||
          result.error.category === "forbidden"
        ) {
          ended = true;
          setConnection("ended");
          socket?.close();
        }
        throw new Error(result.error.code);
      }
      return result.value;
    }
    async function update(id: string, version: number) {
      if (disposed || ended || (seen.get(id) ?? 0) >= version) return;
      const change = await read<WindowChange>(
        `/api/events/${initial.eventId}/commands/${id}?${params}&window=1`,
        commandWindowSchema,
      );
      const previous = dataRef.current;
      const next = await reconcileCommandWindow(previous, change, (id) =>
        read<Command | null>(
          `/api/events/${initial.eventId}/commands/${id}`,
          commandResponseSchema.nullable(),
        ),
      );
      if (disposed || ended) return;
      dataRef.current = next;
      setData(next);
      if (next.page !== previous.page) {
        params.set("page", String(next.page));
        router.replace(`${basePath}?${params}`, { scroll: false });
      }
      seen.set(id, Math.max(version, change.order?.version ?? version));
    }
    function fail() {
      if (disposed || ended) return;
      ready = false;
      setInterrupted(true);
      setConnection("offline");
      socket?.close();
    }
    function enqueue(id: string, version: number) {
      chain = chain.then(() => update(id, version)).catch(fail);
      return chain;
    }
    refreshRef.current = enqueue;
    function connect() {
      if (disposed || ended) return;
      ready = false;
      setConnection("syncing");
      const url = new URL(
        `/api/events/${initial.eventId}/commands/socket`,
        location.href,
      );
      url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const active = new WebSocket(url);
      socket = active;
      const current = ++generation;
      active.onmessage = (e) => {
        if (disposed || ended || current !== generation) return;
        let raw: unknown;
        try {
          raw = JSON.parse(e.data);
        } catch {
          fail();
          return;
        }
        const parsed = commandNoticeSchema.safeParse(raw);
        if (!parsed.success) {
          fail();
          return;
        }
        const message = parsed.data;
        if (message.type === "session-ended") {
          ended = true;
          setConnection("ended");
          socket?.close();
          return;
        }
        if (message.type === "order") {
          if (ready) enqueue(message.id, message.version);
          else queue.push({ id: message.id, version: message.version });
        }
        if (message.type === "ready") {
          chain = chain
            .then(async () => {
              const snapshot = await read<CommandPage>(
                `/api/events/${initial.eventId}/commands?${params}`,
                commandPageSchema,
              );
              if (
                disposed ||
                ended ||
                active.readyState !== WebSocket.OPEN ||
                current !== generation
              )
                return;
              dataRef.current = snapshot;
              setData(snapshot);
              seen.clear();
              for (const item of snapshot.items)
                seen.set(item.id, item.version);
              while (queue.length) {
                const notice = queue.shift()!;
                await update(notice.id, notice.version);
              }
              if (
                active.readyState === WebSocket.OPEN &&
                current === generation
              ) {
                ready = true;
                attempt = 0;
                setInterrupted(false);
                setConnection("connected");
              }
            })
            .catch(fail);
        }
      };
      active.onclose = async (e) => {
        if (disposed || ended || current !== generation) return;
        if (e.code === 4401) {
          ended = true;
          setConnection("ended");
          return;
        }
        ready = false;
        setInterrupted(true);
        setConnection("offline");
        // A refused upgrade has no WebSocket close status. Authenticate once to distinguish expiry.
        try {
          await read<CommandPage>(
            `/api/events/${initial.eventId}/commands?${params}`,
            commandPageSchema,
          );
        } catch {}
        if (!disposed && !ended)
          retry = setTimeout(
            connect,
            Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5)),
          );
      };
      active.onerror = () => active.close();
    }
    connect();
    return () => {
      disposed = true;
      controller.abort();
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, [
    initial.eventId,
    initial.query,
    initial.page,
    initial.collected,
    basePath,
    router,
  ]);
  const filters = { collected: initial.collected };
  return (
    <div className={styles.page}>
      {(connection === "ended" || interrupted || connection === "offline") &&
      typeof document !== "undefined" ? (
        createPortal(
          <div className={styles.notice} role="status" aria-live="polite">
            <Icon name="alert" />
            <p>
              {connection === "ended"
                ? "Sua sessão foi encerrada"
                : "Sem conexão. As retiradas estarão disponíveis após sincronizar."}
            </p>
          </div>,
          document.body,
        )
      ) : (
        <span className="sr-only" role="status">
          {connection === "syncing"
            ? "Sincronizando comandas"
            : "Comandas atualizadas"}
        </span>
      )}
      <SearchForm
        action={basePath}
        query={initial.query}
        label="Buscar pelo nome"
        filters={filters}
        actions={
          <CommandFilters
            basePath={basePath}
            collected={initial.collected}
            query={initial.query}
          />
        }
      />
      <section aria-label="Comandas">
        {data.items.length ? (
          <ul className="record-list">
            {data.items.map((order) => (
              <li key={order.id} className="record-row">
                <div className={styles.content}>
                  <h2 className="record-title">{order.customerName}</h2>
                  <p
                    className={`record-meta ${styles.pickupStatus}${order.collected ? " muted" : ` ${styles.waiting}`}`}
                  >
                    {order.collected && <Icon name="check" />}
                    <span>{order.collected ? "Retirado" : "A retirar"}</span>
                  </p>
                  <ul className={styles.items}>
                    {order.items.map((i, n) => (
                      <li key={n}>
                        <span className={styles.quantity}>{i.quantity}×</span>{" "}
                        {i.name}
                      </li>
                    ))}
                  </ul>
                  {order.note && <p className="preserve-lines">{order.note}</p>}
                </div>
                <Button
                  variant="neutral"
                  busy={pending}
                  disabled={connection !== "connected"}
                  onClick={() =>
                    execute(
                      () =>
                        collectCommandAction(initial.eventId, order.id, {
                          requestId: crypto.randomUUID(),
                          version: order.version,
                          collected: !order.collected,
                        }),
                      (v) => {
                        void refreshRef.current(v.id, v.version);
                      },
                    )
                  }
                >
                  {order.collected ? "Desfazer retirada" : "Marcar retirado"}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <SectionFeedback area="pedidos">
            {initial.query
              ? "Nenhum pedido encontrado."
              : initial.collected === "collected"
                ? "Nenhum pedido retirado."
                : initial.collected === "waiting"
                  ? "Nenhum pedido aguardando retirada."
                  : "Nenhum pedido encontrado."}
          </SectionFeedback>
        )}
      </section>
      <Pagination
        basePath={basePath}
        page={data.page}
        pageSize={15}
        total={data.total}
        query={initial.query}
        filters={filters}
      />
      <ErrorModal error={error} onClose={closeError} />
    </div>
  );
}
