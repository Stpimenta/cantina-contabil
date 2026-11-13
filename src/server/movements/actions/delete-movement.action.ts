"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createMovements } from "../composition";
export async function deleteMovementAction(form: FormData) {
  return executeOperation(
    {
      operation: "movement.delete",
      message:
        "Não foi possível confirmar a operação. Confira as movimentações antes de tentar novamente.",
      source: "src/server/movements/actions/delete-movement.action.ts",
      route: "/movements",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const result = await createMovements().delete.execute(session, {
        id: form.get("id"),
        version: Number(form.get("version")),
      });
      revalidatePath("/movements");
      revalidatePath("/cash-boxes", "layout");
      revalidatePath("/events", "layout");
      return { id: result.id };
    },
  );
}
