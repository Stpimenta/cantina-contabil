"use server";
import { createAuth } from "@/server/auth/composition";
import { createDeliveries } from "../composition";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function listDeliveryCandidatesAction(
  eventId: string,
  input: unknown,
) {
  return executeOperation(
    {
      operation: "deliveries.list.candidates",
      message:
        "Não foi possível confirmar a operação. Confira os dados antes de repetir.",
      source:
        "src/server/deliveries/actions/list-delivery-candidates.action.ts",
      route: "/events/[id]/deliveries",
      method: "POST",
    },
    async () => {
      const value = await createDeliveries().candidates.execute(
        await createAuth().getSession.execute(),
        eventId,
        input,
      );

      return value;
    },
  );
}
