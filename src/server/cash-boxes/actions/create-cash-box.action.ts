"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { throwBusinessError } from "@/shared/errors/business-error";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createCashBoxes } from "../composition";

export async function createCashBoxAction(form: FormData) {
  return executeOperation(
    {
      operation: "cash-box.create",
      message:
        "Não foi possível confirmar o cadastro. Atualize a lista antes de tentar novamente.",
      source: "src/server/cash-boxes/actions/create-cash-box.action.ts",
      route: "/caixas",
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
      const value = await createCashBoxes().create.execute(session, {
        name,
        description,
      });
      revalidatePath("/caixas");
      return value;
    },
  );
}
