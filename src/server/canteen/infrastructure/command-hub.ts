import type {
  DurableObjectState,
  D1Database,
  WebSocket as WorkerSocket,
  Request as WorkerRequest,
  Response as WorkerResponse,
} from "@cloudflare/workers-types";
import { z } from "zod";
import { InfrastructureError } from "@/shared/errors/infrastructure-error";
import type { CommandActor } from "../models/command-actor.model";
const armSchema = z.object({ eventId: z.uuid(), operation: z.uuid() });
const actorSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("user"),
    accountId: z.number().int().positive().optional(),
    accountSessionId: z.uuid().optional(),
    id: z.number().int(),
    name: z.string(),
    expiresAt: z.number().int(),
  }),
  z.object({
    kind: z.literal("access"),
    id: z.uuid(),
    eventId: z.uuid(),
    name: z.string(),
    createdBy: z.number().int(),
    createdByName: z.string(),
    expiresAt: z.number().int(),
  }),
]);
declare const WebSocketPair: { new (): { 0: WorkerSocket; 1: WorkerSocket } };
function attachedActor(socket: WorkerSocket): CommandActor {
  const result = actorSchema.safeParse(socket.deserializeAttachment());
  if (!result.success)
    throw new InfrastructureError(
      "Invalid command socket attachment",
      "durable-object",
    );
  return result.data;
}
interface HubEnvironment {
  DB: D1Database;
}
interface Notice {
  id: string;
  order_id: string;
  version: number;
  kind: string;
}
// One hibernating hub per event. Only the authenticated app can call this binding.
export class CommandHub {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: HubEnvironment,
  ) {}
  async fetch(request: WorkerRequest): Promise<WorkerResponse> {
    return this.state.blockConcurrencyWhile(async () => {
      const path = new URL(request.url).pathname;
      if (path === "/arm" && request.method === "POST") {
        const parsed = armSchema.safeParse(await request.json());
        if (!parsed.success)
          return new Response(null, {
            status: 400,
          }) as unknown as WorkerResponse;
        const { eventId, operation } = parsed.data;
        const previous = await this.state.storage.get<string>("eventId");
        if (previous && previous !== eventId)
          return new Response(null, {
            status: 403,
          }) as unknown as WorkerResponse;
        // Durable output gate commits the event and alarm before D1 can be changed.
        await this.state.storage.transaction(async (txn) => {
          await txn.put("eventId", eventId);
          const alarm = await txn.getAlarm();
          if (!alarm || alarm > Date.now() + 1000)
            await txn.setAlarm(Date.now() + 1000);
        });
        await this.env.DB.prepare(
          "INSERT INTO canteen_publications(id,event_id,deadline,state) VALUES(?,?,unixepoch()+120,'armed') ON CONFLICT(id) DO NOTHING",
        )
          .bind(operation, eventId)
          .run();
        return new Response(null, { status: 204 }) as unknown as WorkerResponse;
      }
      if (path === "/flush") {
        await this.drain();
        return new Response(null, { status: 204 }) as unknown as WorkerResponse;
      }
      if (
        path === "/socket" &&
        request.headers.get("Upgrade")?.toLowerCase() === "websocket"
      ) {
        const parsed = actorSchema.safeParse(
          JSON.parse(request.headers.get("x-command-actor") ?? "null"),
        );
        const eventId = request.headers.get("x-command-event");
        if (
          !parsed.success ||
          !eventId ||
          !z.uuid().safeParse(eventId).success ||
          !(await this.valid(parsed.data, eventId))
        )
          return new Response(null, {
            status: 401,
          }) as unknown as WorkerResponse;
        const stored = await this.state.storage.get<string>("eventId");
        if (stored && stored !== eventId)
          return new Response(null, {
            status: 403,
          }) as unknown as WorkerResponse;
        await this.state.storage.put("eventId", eventId);
        const pair = new WebSocketPair();
        this.state.acceptWebSocket(pair[1]);
        pair[1].serializeAttachment(parsed.data);
        // Socket is registered before ready. Client queues notices until its snapshot arrives.
        pair[1].send(JSON.stringify({ type: "ready" }));
        await this.schedule();
        return new Response(null, {
          status: 101,
          webSocket: pair[0],
        } as ResponseInit) as unknown as WorkerResponse;
      }
      return new Response(null, { status: 404 }) as unknown as WorkerResponse;
    });
  }
  private async valid(actor: CommandActor, eventId: string) {
    if (actor.expiresAt <= Math.floor(Date.now() / 1000)) return false;
    if (actor.kind === "user") {
      if (!actor.accountId || !actor.accountSessionId) return false;
      return !!(await this.env.DB.prepare(
        "SELECT s.id FROM account_sessions s JOIN local_accounts a ON a.id=s.account_id WHERE s.id=? AND a.id=? AND a.state='active' AND s.revoked_at IS NULL AND s.last_active_at>unixepoch()-43200 AND EXISTS(SELECT 1 FROM events e WHERE e.id=? AND e.deleted_at IS NULL AND (coalesce(a.access_role,a.role)='admin' OR (a.access_role='finance' AND e.cash_box_id IN(SELECT value FROM json_each(a.cash_box_ids_json))) OR (a.access_role='operator' AND e.id IN(SELECT value FROM json_each(a.access_json,'$.eventIds')))))",
      )
        .bind(actor.accountSessionId, actor.accountId, eventId)
        .first());
    }
    if (actor.eventId !== eventId) return false;
    return !!(await this.env.DB.prepare(
      "SELECT id FROM canteen_access WHERE id=? AND event_id=? AND revoked_at IS NULL AND expires_at>unixepoch() AND session_hash IS NOT NULL",
    )
      .bind(actor.id, eventId)
      .first());
  }
  private end(socket: WorkerSocket) {
    socket.send(JSON.stringify({ type: "session-ended" }));
    socket.close(4401, "Session ended");
  }
  private async drain() {
    const eventId = await this.state.storage.get<string>("eventId");
    if (!eventId) return;
    // Persist another wake BEFORE IO: pending work survives more than the platform's six retries.
    await this.state.storage.setAlarm(Date.now() + 30000);
    await this.env.DB.prepare(
      "UPDATE canteen_publications SET state='cancelled' WHERE event_id=? AND state='armed' AND deadline<=unixepoch()",
    )
      .bind(eventId)
      .run();
    const notices = await this.env.DB.prepare(
      "SELECT id,order_id,version,kind FROM canteen_publications WHERE event_id=? AND state='committed' ORDER BY rowid LIMIT 100",
    )
      .bind(eventId)
      .all<Notice>();
    for (const notice of notices.results) {
      for (const socket of this.state.getWebSockets()) {
        if (socket.readyState !== 1) continue;
        const actor = attachedActor(socket);
        if (!(await this.valid(actor, eventId))) {
          this.end(socket);
          continue;
        }
        if (notice.kind === "order")
          socket.send(
            JSON.stringify({
              type: "order",
              id: notice.order_id,
              version: notice.version,
            }),
          );
      }
      // At least once: a crash after send may repeat; clients compare versions.
      await this.env.DB.prepare(
        "UPDATE canteen_publications SET state='published' WHERE id=? AND state='committed'",
      )
        .bind(notice.id)
        .run();
    }
    for (const socket of this.state.getWebSockets())
      if (
        socket.readyState === 1 &&
        !(await this.valid(attachedActor(socket), eventId))
      )
        this.end(socket);
    await this.schedule();
  }
  private async schedule() {
    const eventId = await this.state.storage.get<string>("eventId");
    if (!eventId) return;
    const pending = await this.env.DB.prepare(
      "SELECT min(min(deadline,unixepoch()+1)) AS due FROM canteen_publications WHERE event_id=? AND state IN('armed','committed')",
    )
      .bind(eventId)
      .first<{ due: number | null }>();
    const times = this.state
      .getWebSockets()
      .filter((s) => s.readyState === 1)
      .map((s) => attachedActor(s).expiresAt * 1000);
    if (pending?.due) times.push(pending.due * 1000);
    if (times.length)
      await this.state.storage.setAlarm(
        Math.max(Date.now() + 100, Math.min(...times)),
      );
    else await this.state.storage.deleteAlarm();
  }
  async alarm() {
    await this.state.blockConcurrencyWhile(() => this.drain());
  }
  async webSocketMessage(socket: WorkerSocket) {
    const e = await this.state.storage.get<string>("eventId");
    if (!e || !(await this.valid(attachedActor(socket), e))) this.end(socket);
  }
  async webSocketClose() {
    await this.state.blockConcurrencyWhile(() => this.schedule());
  }
  webSocketError(socket: WorkerSocket) {
    socket.close(1011, "Connection closed");
  }
}
