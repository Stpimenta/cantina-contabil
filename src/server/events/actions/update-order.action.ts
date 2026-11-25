"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createEvents } from "../composition";
export async function updateOrderAction(
  eventId: string,
  id: string,
  version: number,
  input: unknown,
  attachments?: FormData,
) {
  return executeOperation(
    {
      operation: "event.updateOrder",
      message:
        "Não foi possível confirmar a operação. Atualize os registros antes de tentar novamente.",
      source: "src/server/events/actions/update-order.action.ts",
      route: "/events",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const value = await createEvents().updateOrder.execute(
        session,
        eventId,
        id,
        version,
        input,
        attachments
          ?.getAll("receipts")
          .filter((entry): entry is File => entry instanceof File) ?? [],
      );
      revalidatePath("/events", "layout");
      revalidatePath(`/events/${eventId}`);
      revalidatePath(`/events/${eventId}/orders`);
      revalidatePath("/cash-boxes", "layout");
      revalidatePath("/products", "layout");
      return value;
    },
  );
}
