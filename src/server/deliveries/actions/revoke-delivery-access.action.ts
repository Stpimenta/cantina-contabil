"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { createDeliveries } from "../composition";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function revokeDeliveryAccessAction(eventId: string, id: string) {
  return executeOperation(
    {
      operation: "deliveries.revoke",
      message:
        "Não foi possível confirmar a operação. Confira os dados antes de repetir.",
      source: "src/server/deliveries/actions/revoke-delivery-access.action.ts",
      route: "/events/[id]/deliveries",
      method: "POST",
    },
    async () => {
      const value = await createDeliveries().revoke.execute(
        await createAuth().getSession.execute(),
        eventId,
        id,
      );
      revalidatePath(`/events/${eventId}/deliveries`);
      return value;
    },
  );
}
