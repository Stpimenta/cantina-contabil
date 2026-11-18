import type { LocalAccount } from "../models/local-account.model";

export interface ImportedAccountInput {
  externalUserId: number;
  birthDate?: string | null;
  phoneCountry?: string | null;
  phoneNumber?: string | null;
  name: string;
  email: string;
  now: string;
}

export interface LocalAccountRepository {
  softDelete(
    id: number,
    version: number,
    actorId: number,
    at: string,
  ): Promise<boolean>;
  eventOptions(): Promise<{ id: string; name: string; kind?: string }[]>;
  list(
    query: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: LocalAccount[]; total: number; page: number }>;
  manage(
    data: {
      id: number;
      version: number;
      role: "admin" | "finance" | "operator";
      blocked: boolean;
      restoreDeleted?: boolean;
      cashBoxIds: string[];
      cashBoxWriteIds?: string[];
      eventIds?: string[];
      eventWriteIds?: string[];
    },
    actorId: number,
    at: string,
  ): Promise<boolean>;
  findByEmail(email: string): Promise<LocalAccount | null>;
  bindSubject(id: number, subject: string): Promise<boolean>;
  reserveInvited(
    name: string,
    email: string,
    now: string,
  ): Promise<LocalAccount | null>;
  findById(id: number): Promise<LocalAccount | null>;
  findBySubject(subject: string): Promise<LocalAccount | null>;
  findByExternalUserId(externalUserId: number): Promise<LocalAccount | null>;
  reserveImported(input: ImportedAccountInput): Promise<LocalAccount | null>;
}
