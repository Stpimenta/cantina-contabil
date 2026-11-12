import { InfrastructureError } from "@/shared/errors/infrastructure-error";
import type { PostalAddressRepository } from "../repositories/postal-address.repository";
import type { PostalAddress } from "../models/postal-address.model";
import { viaCepResponseSchema } from "./viacep-response.schema";
export class ViaCepPostalAddressRepository implements PostalAddressRepository {
  constructor(private readonly request: typeof fetch = fetch) {}
  async findByPostalCode(postalCode: string): Promise<PostalAddress | null> {
    const response = await this.request(
      `https://viacep.com.br/ws/${postalCode}/json/`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok)
      throw new InfrastructureError(
        "Consulta de CEP indisponível",
        "viacep",
        response.status,
      );
    const body: unknown = await response.json();
    const parsed = viaCepResponseSchema.safeParse(body);
    if (!parsed.success)
      throw new InfrastructureError(
        "Contrato de CEP inválido",
        "viacep",
        response.status,
      );
    const address = parsed.data;
    if ("erro" in address && address.erro) return null;
    if (!("cep" in address) || address.cep.replace("-", "") !== postalCode)
      throw new InfrastructureError(
        "CEP da resposta divergente",
        "viacep",
        response.status,
      );
    return {
      postalCode,
      street: address.logradouro,
      neighborhood: address.bairro,
      city: address.localidade,
      state: address.uf,
    };
  }
}
