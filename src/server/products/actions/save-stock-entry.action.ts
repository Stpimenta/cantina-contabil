"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createProducts } from "../composition";
export async function saveStockEntryAction(input: unknown) {
  return executeOperation(
    {
      operation: "stock.entry.save",
      message:
        "Não foi possível confirmar a gravação. Confira os registros antes de tentar novamente.",
      source: "src/server/products/actions/save-stock-entry.action.ts",
      route: "/products",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const value = await createProducts().saveEntry.execute(session, input);
      revalidatePath("/products", "layout");
      revalidatePath("/cash-boxes", "layout");
      return value;
    },
  );
}
