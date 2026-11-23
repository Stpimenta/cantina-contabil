"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { createDeliveries } from "../composition";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function createDeliveryAccessAction(
  eventId: string,
  input: unknown,
) {
  return executeOperation(
    {
      operation: "deliveries.createAccess",
      message:
        "Não foi possível confirmar a operação. Confira os dados antes de repetir.",
      source: "src/server/deliveries/actions/create-delivery-access.action.ts",
      route: "/events/[id]/deliveries",
      method: "POST",
    },
    async () => {
      const value = await createDeliveries().createAccess.execute(
        await createAuth().getSession.execute(),
        eventId,
        input,
      );
      revalidatePath(`/events/${eventId}/deliveries`);
      return value;
    },
  );
}
