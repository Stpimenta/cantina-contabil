import type { TemporaryAccess } from "../models/temporary-access.model";
import type {
  CommandIdentity,
  CommandActor,
} from "../models/command-actor.model";
import type { CommandPage, CommandFilter } from "../models/command.model";
export interface CanteenRepository {
  accessByCredential(hash: string): Promise<TemporaryAccess | null>;
  accessByLink(hash: string): Promise<TemporaryAccess | null>;
  createAccess(access: TemporaryAccess, linkHash: string): Promise<boolean>;
  activate(hash: string, sessionHash: string): Promise<TemporaryAccess | null>;
  revoke(id: string, eventId: string, operation: string): Promise<void>;
  listAccess(eventId: string): Promise<TemporaryAccess[]>;
  commands(
    eventId: string,
    query: string,
    page: number,
    collected: CommandFilter,
  ): Promise<CommandPage>;
}
export interface CredentialCodec {
  random(): string;
  hash(value: string): Promise<string>;
}
export interface CommandAuthorization {
  resolve(identity: CommandIdentity, eventId: string): Promise<CommandActor>;
}
export interface PublicationCoordinator {
  arm(eventId: string, operation: string): Promise<void>;
}
