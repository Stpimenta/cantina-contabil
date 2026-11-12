import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { validateLookupPostalCode } from "../inputs/lookup-postal-code.input";
import type { PostalAddressRepository } from "../repositories/postal-address.repository";
export class LookupPostalCodeUseCase {
  constructor(private readonly addresses: PostalAddressRepository) {}
  execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const { postalCode } = parseInput(validateLookupPostalCode(input));
    return this.addresses.findByPostalCode(postalCode);
  }
}
