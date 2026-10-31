"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createEvents } from "../composition";
export async function receiveSupplyAction(
  eventId: string,
  id: string,
  version: number,
) {
  return executeOperation(
    {
      operation: "event.supply.receive",
      message:
        "Não foi possível confirmar o recebimento. Confira os insumos antes de repetir.",
      source: "src/server/events/actions/receive-supply.action.ts",
      route: "/eventos/[id]/insumos",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const value = await createEvents().receiveSupply.execute(
        session,
        eventId,
        id,
        version,
      );
      revalidatePath(`/eventos/${eventId}`);
      revalidatePath(`/eventos/${eventId}/insumos`);
      return value;
    },
  );
}
