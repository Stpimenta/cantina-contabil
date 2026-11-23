"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { createDeliveries } from "../composition";
import { deliveryCredential } from "../infrastructure/http-identity";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function deliverOrderAction(
  eventId: string,
  id: string,
  input: unknown,
  temporary = false,
) {
  return executeOperation(
    {
      operation: "deliveries.deliver",
      message:
        "Não foi possível confirmar a entrega. Confira os pedidos antes de repetir.",
      source: "src/server/deliveries/actions/deliver-order.action.ts",
      route: "/deliveries",
      method: "POST",
    },
    async () => {
      const identity = temporary
        ? { kind: "temporary" as const, credential: await deliveryCredential() }
        : {
            kind: "user" as const,
            session: await createAuth().getSession.execute(),
          };
      const value = await createDeliveries().deliver.execute(
        identity,
        eventId,
        id,
        input,
      );
      revalidatePath(`/events/${eventId}`);
      revalidatePath(`/deliveries/${eventId}`);
      return value;
    },
  );
}
