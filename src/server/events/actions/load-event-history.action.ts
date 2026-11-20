"use server";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createEvents } from "../composition";

export async function loadEventHistoryAction(eventId: string, page: number) {
  return executeOperation(
    {
      operation: "event.history.load",
      message: "Não foi possível carregar o histórico. Tente novamente.",
      source: "src/server/events/actions/load-event-history.action.ts",
      route: "/events",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      return createEvents().history.execute(session, eventId, { page });
    },
  );
}
