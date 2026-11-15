import { GetCommandWindowUseCase } from "./use-cases/get-command-window.use-case";
import "server-only";
import { createDatabase } from "@/shared/infrastructure/database";
import { D1EventRepository } from "@/server/events/infrastructure/d1-event.repository";
import { D1CanteenRepository } from "./infrastructure/d1-canteen.repository";
import { DurablePublicationCoordinator } from "./infrastructure/publication-coordinator";
import { credentialCodec } from "./infrastructure/credential-codec";
import { ResolveCommandAuthorization } from "./infrastructure/command-authorization";
import { ListCommandsUseCase } from "./use-cases/list-commands.use-case";
import { GetCommandUseCase } from "./use-cases/get-command.use-case";
import { CollectCommandUseCase } from "./use-cases/collect-command.use-case";
import { CreateAccessUseCase } from "./use-cases/create-access.use-case";
import { ActivateAccessUseCase } from "./use-cases/activate-access.use-case";
import { ListAccessUseCase } from "./use-cases/list-access.use-case";
import { RevokeAccessUseCase } from "./use-cases/revoke-access.use-case";
export function createCanteen() {
  const db = createDatabase(),
    publications = new DurablePublicationCoordinator(),
    repo = new D1CanteenRepository(db),
    events = new D1EventRepository(db, publications),
    auth = new ResolveCommandAuthorization(repo, credentialCodec);
  const get = new GetCommandUseCase(events, auth),
    list = new ListCommandsUseCase(events, repo, auth);
  return {
    window: new GetCommandWindowUseCase(get, list),
    auth,
    list: new ListCommandsUseCase(events, repo, auth),
    get: new GetCommandUseCase(events, auth),
    collect: new CollectCommandUseCase(events, auth),
    createAccess: new CreateAccessUseCase(repo, events, credentialCodec),
    activate: new ActivateAccessUseCase(repo, credentialCodec),
    accesses: new ListAccessUseCase(repo),
    revoke: new RevokeAccessUseCase(repo, publications),
  };
}
