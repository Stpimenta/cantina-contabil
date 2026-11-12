export type CommandActor =
  | { kind: "user"; id: number; name: string; expiresAt: number }
  | {
      kind: "access";
      id: string;
      name: string;
      eventId: string;
      createdBy: number;
      createdByName: string;
      expiresAt: number;
    };
export type CommandIdentity =
  | {
      kind: "user";
      session: import("@/server/auth/models/session.model").Session | null;
    }
  | { kind: "access"; credential: string };
