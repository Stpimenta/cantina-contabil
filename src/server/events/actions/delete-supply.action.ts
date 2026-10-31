"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createEvents } from "../composition";
export async function deleteSupplyAction(
  eventId: string,
  id: string,
  version: number,
) {
  return executeOperation(
    {
      operation: "event.supply.delete",
      message:
        "Não foi possível confirmar o exclusão. Confira os insumos antes de repetir.",
      source: "src/server/events/actions/delete-supply.action.ts",
      route: "/eventos/[id]/insumos",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const value = await createEvents().deleteSupply.execute(
        session,
        eventId,
        id,
        version,
      );
      revalidatePath(`/eventos/${eventId}`);
      revalidatePath(`/eventos/${eventId}/insumos`);
      revalidatePath("/caixas", "layout");
      return value;
    },
  );
}
