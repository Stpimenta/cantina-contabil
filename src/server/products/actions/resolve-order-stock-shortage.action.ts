"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createProducts } from "../composition";

export async function resolveOrderStockShortageAction(input: unknown) {
  return executeOperation(
    {
      operation: "stock.shortage.resolve",
      message:
        "Não foi possível confirmar a entrada. Confira o estoque antes de repetir.",
      source:
        "src/server/products/actions/resolve-order-stock-shortage.action.ts",
      route: "/products",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const value = await createProducts().resolveShortage.execute(
        session,
        input,
      );
      revalidatePath("/products", "layout");
      return value;
    },
  );
}
