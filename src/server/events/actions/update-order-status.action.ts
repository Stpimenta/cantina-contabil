"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createEvents } from "../composition";
export async function updateOrderStatusAction(
  eventId: string,
  id: string,
  version: number,
  input: unknown,
) {
  return executeOperation(
    {
      operation: "event.updateOrderStatus",
      message:
        "Não foi possível confirmar a operação. Atualize os registros antes de tentar novamente.",
      source: "src/server/events/actions/update-order-status.action.ts",
      route: "/events",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const value = await createEvents().updateOrderStatus.execute(
        session,
        eventId,
        id,
        version,
        input,
      );
      revalidatePath("/events");
      revalidatePath(`/events/${eventId}`);
      revalidatePath(`/events/${eventId}/orders`);
      revalidatePath("/cash-boxes", "layout");
      revalidatePath("/products", "layout");
      return value;
    },
  );
}
