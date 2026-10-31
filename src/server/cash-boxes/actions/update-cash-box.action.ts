"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { throwBusinessError } from "@/shared/errors/business-error";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createCashBoxes } from "../composition";

export async function updateCashBoxAction(
  id: string,
  version: number,
  form: FormData,
) {
  return executeOperation(
    {
      operation: "cash-box.update",
      message:
        "Não foi possível confirmar a alteração. Atualize os dados antes de tentar novamente.",
      source: "src/server/cash-boxes/actions/update-cash-box.action.ts",
      route: "/caixas/[id]",
      method: "POST",
    },
    async (context) => {
      const name = form.get("name");
      const description = form.get("description");

      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      if (!session)
        throwBusinessError({
          code: "SESSION_EXPIRED",
          category: "unauthenticated",
        });
      context.cashBoxId = id;
      const value = await createCashBoxes().update.execute(
        session,
        id,
        version,
        { name, description },
      );
      revalidatePath("/caixas");
      revalidatePath(`/caixas/${id}`);
      return value;
    },
  );
}
