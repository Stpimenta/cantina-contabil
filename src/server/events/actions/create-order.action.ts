"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createEvents } from "../composition";
export async function createOrderAction(eventId: string, input: unknown) {
  return executeOperation(
    {
      operation: "event.createOrder",
      message:
        "Não foi possível confirmar a operação. Atualize os registros antes de tentar novamente.",
      source: "src/server/events/actions/create-order.action.ts",
      route: "/eventos",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const value = await createEvents().createOrder.execute(
        session,
        eventId,
        input,
      );
      revalidatePath("/eventos");
      revalidatePath(`/eventos/${eventId}`);
      revalidatePath(`/eventos/${eventId}/pedidos`);
      revalidatePath("/caixas", "layout");
      return value;
    },
  );
}
