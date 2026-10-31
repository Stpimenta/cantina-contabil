import type { Session } from "../models/session.model";

export interface SessionRepository {
  read(): Promise<Session | null>;
  create(session: Session): Promise<void>;
  destroy(): Promise<void>;
}
