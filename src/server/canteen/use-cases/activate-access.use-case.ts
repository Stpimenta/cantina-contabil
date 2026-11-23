import { throwBusinessError } from "@/shared/errors/business-error";
import type {
  CanteenRepository,
  CredentialCodec,
} from "../repositories/canteen.repository";
import { credentialSchema } from "../inputs/command.input";
export class ActivateAccessUseCase {
  constructor(
    private readonly repo: Pick<
      CanteenRepository,
      "accessByLink" | "accessByCredential" | "activate"
    >,
    private readonly codec: CredentialCodec,
  ) {}
  async execute(secret: unknown, currentCredential?: string) {
    const parsed = credentialSchema.safeParse(secret);
    if (!parsed.success) return this.ended();
    const hash = await this.codec.hash(parsed.data),
      a = await this.repo.accessByLink(hash);
    if (
      !a ||
      a.revokedAt !== null ||
      a.expiresAt <= Math.floor(Date.now() / 1000)
    )
      return this.ended();
    if (
      currentCredential &&
      credentialSchema.safeParse(currentCredential).success
    ) {
      const current = await this.repo.accessByCredential(
        await this.codec.hash(currentCredential),
      );
      if (current?.id === a.id)
        return { access: current, credential: currentCredential };
    }
    const credential = this.codec.random(),
      access = await this.repo.activate(
        hash,
        await this.codec.hash(credential),
      );
    if (!access)
      throwBusinessError({ code: "TEMP_ACCESS_USED", category: "conflict" });
    return { access, credential };
  }
  private ended(): never {
    return throwBusinessError({
      code: "TEMP_ACCESS_ENDED",
      category: "unauthenticated",
    });
  }
}
