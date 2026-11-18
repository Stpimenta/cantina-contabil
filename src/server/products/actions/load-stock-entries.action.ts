"use server";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createProducts } from "../composition";
export async function loadStockEntriesAction(
  categoryId: string,
  productId: string,
  cursor: unknown,
) {
  return executeOperation(
    {
      operation: "stock.entries.load",
      message: "Não foi possível carregar as entradas. Tente novamente.",
      source: "src/server/products/actions/load-stock-entries.action.ts",
      route: "/products",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      return createProducts().loadEntries.execute(
        session,
        categoryId,
        productId,
        cursor,
      );
    },
  );
}
