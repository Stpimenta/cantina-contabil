import "server-only";
import { ViaCepPostalAddressRepository } from "./infrastructure/viacep-postal-address.repository";
import { LookupPostalCodeUseCase } from "./use-cases/lookup-postal-code.use-case";
export function createAddresses() {
  return {
    lookupPostalCode: new LookupPostalCodeUseCase(
      new ViaCepPostalAddressRepository(),
    ),
  };
}
