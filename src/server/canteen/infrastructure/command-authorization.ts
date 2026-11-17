import { checkAccess } from "@/shared/auth/check-access";
import { throwBusinessError } from "@/shared/errors/business-error";
import type {
  CommandAuthorization,
  CanteenRepository,
  CredentialCodec,
} from "../repositories/canteen.repository";
import type {
  CommandIdentity,
  CommandActor,
} from "../models/command-actor.model";
import { credentialSchema } from "../inputs/command.input";
export class ResolveCommandAuthorization implements CommandAuthorization {
  constructor(
    private readonly accesses: CanteenRepository,
    private readonly codec: CredentialCodec,
  ) {}
  async resolve(
    identity: CommandIdentity,
    eventId: string,
  ): Promise<CommandActor> {
    if (identity.kind === "user") {
      const s = checkAccess(identity.session);
      return {
        kind: "user",
        accountId: s.accountId,
        accountSessionId: s.accountSessionId,
        id: s.user.id,
        name: s.user.name,
        expiresAt: s.expiresAt,
      };
    }
    if (!credentialSchema.safeParse(identity.credential).success)
      return this.ended();
    const a = await this.accesses.accessByCredential(
      await this.codec.hash(identity.credential),
    );
    if (
      !a ||
      a.eventId !== eventId ||
      a.revokedAt !== null ||
      a.expiresAt <= Math.floor(Date.now() / 1000)
    )
      return this.ended();
    return {
      kind: "access",
      id: a.id,
      name: a.name,
      eventId: a.eventId,
      createdBy: a.createdBy,
      createdByName: a.createdByName,
      expiresAt: a.expiresAt,
    };
  }
  private ended(): never {
    return throwBusinessError({
      code: "TEMP_ACCESS_ENDED",
      category: "unauthenticated",
    });
  }
}
