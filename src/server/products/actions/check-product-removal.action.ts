"use server";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createProducts } from "../composition";
export async function checkProductRemovalAction(
  categoryId: string,
  productId: string,
) {
  return executeOperation(
    {
      operation: "product.removal.check",
      message: "Não foi possível verificar o produto. Tente novamente.",
      source: "src/server/products/actions/check-product-removal.action.ts",
      route: "/products",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      return createProducts().checkRemoval.execute(
        session,
        categoryId,
        productId,
      );
    },
  );
}
