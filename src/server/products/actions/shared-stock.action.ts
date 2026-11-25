"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createProducts } from "../composition";
export async function loadSharedStockAction(
  categoryId: string,
  productId: string,
) {
  return executeOperation(
    {
      operation: "stock.shared.load",
      message:
        "Não foi possível consultar o vínculo de estoque. Tente novamente.",
      source: "src/server/products/actions/shared-stock.action.ts",
      route: "/products",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      return createProducts().shared.execute(session, categoryId, productId);
    },
  );
}
export async function manageSharedStockAction(input: unknown) {
  return executeOperation(
    {
      operation: "stock.shared.save",
      message:
        "Não foi possível confirmar o vínculo. Confira o estoque antes de repetir.",
      source: "src/server/products/actions/shared-stock.action.ts",
      route: "/products",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const value = await createProducts().manageShared.execute(session, input);
      revalidatePath("/products", "layout");
      revalidatePath("/events", "layout");
      return value;
    },
  );
}
export async function loadStockHistoryAction(
  categoryId: string,
  productId: string,
  page: number,
) {
  return executeOperation(
    {
      operation: "stock.shared.history",
      message:
        "Não foi possível consultar o histórico de estoque. Tente novamente.",
      source: "src/server/products/actions/shared-stock.action.ts",
      route: "/products",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      return createProducts().stockHistory.execute(
        session,
        categoryId,
        productId,
        page,
      );
    },
  );
}

export async function loadStockImportOptionsAction(categoryId?: string) {
  return executeOperation(
    {
      operation: "stock.import.options",
      message:
        "Não foi possível consultar os produtos existentes. Tente novamente.",
      source: "src/server/products/actions/shared-stock.action.ts",
      route: "/products",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      return createProducts().importOptions.execute(session, categoryId);
    },
  );
}
