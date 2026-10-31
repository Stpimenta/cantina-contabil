import { userProfileSchema } from "./user-profile.schema";
import { InfrastructureError } from "@/shared/errors/infrastructure-error";
import type { User } from "../models/user.model";
import type { UserRepository } from "../repositories/user.repository";
import {
  normalizeBirthDate,
  normalizePhoneField,
} from "../models/profile-details";

export class UserApiRepository implements UserRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  async findOwnProfile(id: number, token: string): Promise<User> {
    const response = await this.request(
      new URL(`/api/Usuario/${id}`, this.baseUrl),
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
        // Never forward the Bearer to a redirect destination.
        redirect: "manual",
      },
    );
    if (!response.ok)
      throw new InfrastructureError(
        "Serviço de perfil retornou uma falha",
        "user-api",
        response.status,
        {
          details: {
            source: "src/server/users/infrastructure/user-api.repository.ts",
            endpoint: "/api/Usuario/{id}",
            method: "GET",
          },
        },
      );
    const body: unknown = await response.json();
    const result = userProfileSchema.safeParse(body);
    if (!result.success || result.data.id !== id) {
      throw new InfrastructureError(
        "Contrato de perfil inválido ou usuário divergente",
        "user-api",
        response.status,
        {
          details: {
            source: "src/server/users/infrastructure/user-api.repository.ts",
            endpoint: "/api/Usuario/{id}",
            method: "GET",
          },
        },
      );
    }
    const details = result.data;
    return {
      id,
      name: details.nome.trim(),
      email: details.email,
      birthDate: normalizeBirthDate(details.data_nascimento),
      phoneCountry: normalizePhoneField(details.telefone_pais),
      phoneNumber: normalizePhoneField(details.telefoneNumero),
    };
  }
}
