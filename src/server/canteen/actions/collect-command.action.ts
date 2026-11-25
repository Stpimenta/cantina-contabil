"use server";
import { revalidatePath } from "next/cache";
import { createCanteen } from "../composition";
import { commandIdentity } from "../infrastructure/http-identity";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function collectCommandAction(
  eventId: string,
  id: string,
  input: unknown,
) {
  return executeOperation(
    {
      operation: "canteen.collect",
      message:
        "Não foi possível confirmar a retirada. Aguarde a sincronização antes de repetir.",
      source: "src/server/canteen/actions/collect-command.action.ts",
      route: "/commands",
      method: "POST",
    },
    async () => {
      const value = await createCanteen().collect.execute(
        await commandIdentity(),
        eventId,
        id,
        input,
      );
      revalidatePath("/products", "layout");
      revalidatePath("/events", "layout");
      return value;
    },
  );
}
