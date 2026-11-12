import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { PublicationCoordinator } from "../repositories/canteen.repository";
import { InfrastructureError } from "@/shared/errors/infrastructure-error";
export class DurablePublicationCoordinator implements PublicationCoordinator {
  async arm(eventId: string, operation: string) {
    const worker = (
      getCloudflareContext().env as unknown as {
        WORKER_SELF_REFERENCE?: {
          armCommands(eventId: string, operation: string): Promise<void>;
        };
      }
    ).WORKER_SELF_REFERENCE;
    if (!worker)
      throw new InfrastructureError(
        "Binding WORKER_SELF_REFERENCE ausente",
        "worker",
      );
    await worker.armCommands(eventId, operation);
  }
}
