import type {
  D1Database,
  DurableObjectNamespace,
  Request as WorkerRequest,
  Response as WorkerResponse,
} from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import { D1EventRepository } from "@/server/events/infrastructure/d1-event.repository";
import { D1CanteenRepository } from "./d1-canteen.repository";
import { ResolveCommandAuthorization } from "./command-authorization";
import { credentialCodec } from "./credential-codec";
import { AuthorizeConnectionUseCase } from "../use-cases/authorize-connection.use-case";
import { verifySession } from "@/server/auth/infrastructure/session-codec";
import { handleFailure } from "@/shared/errors/handle-failure";
import type { CommandIdentity } from "../models/command-actor.model";
import { commandResponse } from "./http-response";
interface SocketEnvironment {
  DB: D1Database;
  COMMANDS: DurableObjectNamespace;
  SESSION_SECRET: string;
  APP_ENV?: string;
}
export async function workerSocket(
  request: WorkerRequest,
  env: SocketEnvironment,
  eventId: string,
): Promise<WorkerResponse> {
  const url = new URL(request.url),
    origin = request.headers.get("Origin");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const localForwarded =
    env.APP_ENV !== "production" &&
    forwardedHost !== null &&
    (origin === `http://${forwardedHost}` ||
      origin === `https://${forwardedHost}`);
  if (
    (origin !== url.origin && !localForwarded) ||
    request.headers.get("Upgrade")?.toLowerCase() !== "websocket"
  )
    return new Response(null, { status: 403 }) as unknown as WorkerResponse;
  // Read only the named cookies, never pass/log the header or any URL credential.
  const cookie = request.headers.get("Cookie") ?? "";
  const read = (name: string) =>
    cookie
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  const production = env.APP_ENV === "production";
  const credential = read(
    production ? "__Host-cantina-command-access" : "cantina-command-access",
  );
  try {
    const identity: CommandIdentity = credential
      ? { kind: "access", credential }
      : {
          kind: "user",
          session: await verifySession(
            read(production ? "__Host-cantina-session" : "cantina-session") ??
              "",
            env.SESSION_SECRET,
          ),
        };
    const db = drizzle(env.DB),
      auth = new ResolveCommandAuthorization(
        new D1CanteenRepository(db),
        credentialCodec,
      );
    const actor = await new AuthorizeConnectionUseCase(
      auth,
      new D1EventRepository(db),
    ).execute(identity, eventId);
    const headers = new Headers({
      Upgrade: "websocket",
      "x-command-event": eventId,
      "x-command-actor": JSON.stringify(actor),
    });
    return env.COMMANDS.get(env.COMMANDS.idFromName(eventId)).fetch(
      "https://commands.internal/socket",
      { headers },
    );
  } catch (error) {
    return commandResponse(
      handleFailure(
        "canteen.socket",
        "Não foi possível abrir a conexão.",
        error,
        { route: "/api/eventos/[id]/comandas/socket", method: "GET" },
      ),
    ) as unknown as WorkerResponse;
  }
}
