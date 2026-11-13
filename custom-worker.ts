import { WorkerEntrypoint } from "cloudflare:workers";
import type {
  Request as WorkerRequest,
  Response as WorkerResponse,
} from "@cloudflare/workers-types";
// @ts-ignore OpenNext generates this module during the isolated build.
import handler from "./.open-next/worker.js";
import { workerSocket } from "./src/server/canteen/infrastructure/worker-socket";
export { CommandHub } from "./src/server/canteen/infrastructure/command-hub";
export default class AppWorker extends WorkerEntrypoint<
  Parameters<typeof workerSocket>[1]
> {
  fetch(request: WorkerRequest): Promise<WorkerResponse> {
    const match = /^\/api\/events\/([^/]+)\/commands\/socket$/.exec(
      new URL(request.url).pathname,
    );
    return match
      ? workerSocket(request, this.env, match[1])
      : handler.fetch(request, this.env, this.ctx);
  }
  // RPC through the existing WORKER_SELF_REFERENCE binding. Not an HTTP endpoint.
  async armCommands(eventId: string, operation: string) {
    const result = await this.env.COMMANDS.get(
      this.env.COMMANDS.idFromName(eventId),
    ).fetch("https://commands.internal/arm", {
      method: "POST",
      body: JSON.stringify({ eventId, operation }),
    });
    if (!result.ok) throw new Error("COMMAND_PUBLICATION_ARM_FAILED");
  }
}
