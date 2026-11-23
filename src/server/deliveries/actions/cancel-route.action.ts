"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { createDeliveries } from "../composition";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function cancelRouteAction(
  eventId: string,
  id: string,
  input: unknown,
) {
  return executeOperation(
    {
      operation: "deliveries.cancel",
      message:
        "Não foi possível confirmar a operação. Confira os dados antes de repetir.",
      source: "src/server/deliveries/actions/cancel-route.action.ts",
      route: "/events/[id]/deliveries",
      method: "POST",
    },
    async () => {
      const value = await createDeliveries().cancel.execute(
        await createAuth().getSession.execute(),
        eventId,
        id,
        input,
      );
      revalidatePath(`/events/${eventId}/deliveries`);
      return value;
    },
  );
}
