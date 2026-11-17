export type LocalAccountRole = "admin" | "finance" | "operator";
export type LocalAccountState = "pending" | "active" | "blocked";

export interface LocalAccount {
  id: number;
  authorId: number;
  birthDate?: string | null;
  phoneCountry?: string | null;
  phoneNumber?: string | null;
  externalUserId: number | null;
  authSubject: string | null;
  name: string;
  email: string;
  role: LocalAccountRole;
  state: LocalAccountState;
  version: number;
  cashBoxIds: string[];
  cashBoxWriteIds?: string[];
  eventIds?: string[];
  eventWriteIds?: string[];
  eventCashBoxIds?: string[];
  createdAt: string;
  updatedAt: string;
}
