"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createEvents } from "../composition";
export async function deleteOrderAction(
  eventId: string,
  id: string,
  version: number,
) {
  return executeOperation(
    {
      operation: "order.delete",
      message:
        "Não foi possível confirmar a operação. Atualize os registros antes de tentar novamente.",
      source: "src/server/events/actions/delete-order.action.ts",
      route: "/eventos",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const value = await createEvents().deleteOrder.execute(
        session,
        eventId,
        id,
        version,
      );
      revalidatePath("/eventos");
      revalidatePath(`/eventos/${value.eventId}`);
      revalidatePath(`/eventos/${value.eventId}/pedidos`);
      revalidatePath("/caixas", "layout");
      return value;
    },
  );
}
