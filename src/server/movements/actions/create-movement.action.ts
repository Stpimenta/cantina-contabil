"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createMovements } from "../composition";
export async function createMovementAction(form: FormData) {
  return executeOperation(
    {
      operation: "movement.create",
      message:
        "Não foi possível confirmar a operação. Confira as movimentações antes de tentar novamente.",
      source: "src/server/movements/actions/create-movement.action.ts",
      route: "/movimentacoes",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const files = form
        .getAll("receipts")
        .filter(
          (entry): entry is File => entry instanceof File && entry.size > 0,
        );
      const result = await createMovements().create.execute(
        session,
        {
          requestId: form.get("requestId"),
          cashBoxId: form.get("cashBoxId"),
          direction: form.get("direction"),
          amount: form.get("amount"),
          occurredOn: form.get("occurredOn"),
          reason: form.get("reason"),
        },
        files,
      );
      revalidatePath("/movimentacoes");
      revalidatePath("/caixas", "layout");
      revalidatePath("/eventos", "layout");
      return { id: result.id };
    },
  );
}
