import { D1SharedStockRepository } from "@/server/products/infrastructure/d1-shared-stock.repository";
import "server-only";
import { createDatabase } from "@/shared/infrastructure/database";
import { D1EventRepository } from "@/server/events/infrastructure/d1-event.repository";
import { credentialCodec } from "@/server/canteen/infrastructure/credential-codec";
import { ActivateAccessUseCase } from "@/server/canteen/use-cases/activate-access.use-case";
import { D1DeliveryRepository } from "./infrastructure/d1-delivery.repository";
import { ResolveDeliveryAccessUseCase } from "./use-cases/resolve-delivery-access.use-case";
import { ListDeliveriesUseCase } from "./use-cases/list-deliveries.use-case";
import { SaveDriverUseCase } from "./use-cases/save-driver.use-case";
import { SaveDeliverySettingsUseCase } from "./use-cases/save-delivery-settings.use-case";
import { SaveRouteUseCase } from "./use-cases/save-route.use-case";
import { StartRouteUseCase } from "./use-cases/start-route.use-case";
import { CancelRouteUseCase } from "./use-cases/cancel-route.use-case";
import { ListDriverDeliveriesUseCase } from "./use-cases/list-driver-deliveries.use-case";
import { ListDeliveryCandidatesUseCase } from "./use-cases/list-delivery-candidates.use-case";
import { MoveDeliveryUseCase } from "./use-cases/move-delivery.use-case";
import { DeliverOrderUseCase } from "./use-cases/deliver-order.use-case";
import { CreateDeliveryAccessUseCase } from "./use-cases/create-delivery-access.use-case";
import { RevokeDeliveryAccessUseCase } from "./use-cases/revoke-delivery-access.use-case";
export function createDeliveries() {
  const db = createDatabase(),
    repo = new D1DeliveryRepository(db),
    events = new D1EventRepository(db),
    auth = new ResolveDeliveryAccessUseCase(repo, events, credentialCodec);
  return {
    list: new ListDeliveriesUseCase(repo, events),
    driverList: new ListDriverDeliveriesUseCase(repo, events, auth),
    candidates: new ListDeliveryCandidatesUseCase(repo, events),
    driver: new SaveDriverUseCase(repo, events),
    settings: new SaveDeliverySettingsUseCase(repo, events),
    saveRoute: new SaveRouteUseCase(repo, events),
    start: new StartRouteUseCase(repo, events),
    cancel: new CancelRouteUseCase(repo, events),
    move: new MoveDeliveryUseCase(repo, events),
    deliver: new DeliverOrderUseCase(
      repo,
      events,
      auth,
      new D1SharedStockRepository(db),
    ),
    createAccess: new CreateDeliveryAccessUseCase(
      repo,
      events,
      credentialCodec,
    ),
    revoke: new RevokeDeliveryAccessUseCase(repo, events),
    activate: new ActivateAccessUseCase(repo, credentialCodec),
  };
}
