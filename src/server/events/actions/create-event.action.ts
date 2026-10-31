"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createEvents } from "../composition";
export async function createEventAction(input: unknown) {
  return executeOperation(
    {
      operation: "event.create",
      message:
        "Não foi possível confirmar a operação. Atualize os registros antes de tentar novamente.",
      source: "src/server/events/actions/create-event.action.ts",
      route: "/eventos",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const value = await createEvents().create.execute(session, input);
      revalidatePath("/eventos");
      revalidatePath(`/eventos/${value.id}`);
      revalidatePath("/caixas", "layout");
      return value;
    },
  );
}
