"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { throwBusinessError } from "@/shared/errors/business-error";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createCashBoxes } from "../composition";

export async function deleteCashBoxAction(id: string, version: number) {
  return executeOperation(
    {
      operation: "cash-box.delete",
      message:
        "Não foi possível confirmar a exclusão. Atualize a lista antes de tentar novamente.",
      source: "src/server/cash-boxes/actions/delete-cash-box.action.ts",
      route: "/caixas/[id]",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      if (!session)
        throwBusinessError({
          code: "SESSION_EXPIRED",
          category: "unauthenticated",
        });
      context.cashBoxId = id;
      const value = await createCashBoxes().delete.execute(
        session,
        id,
        version,
      );
      revalidatePath("/caixas");
      revalidatePath(`/caixas/${id}`);
      return value;
    },
  );
}
