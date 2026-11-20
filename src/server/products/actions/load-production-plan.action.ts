"use server";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createProducts } from "../composition";
export async function loadProductionPlanAction(id: string, period: string) {
  return executeOperation({
    operation: "products.production-plan",
    message: "Não foi possível consultar os produtos. Tente novamente.",
    source: "src/server/products/actions/load-production-plan.action.ts",
    route: "/products",
    method: "POST",
  }, async (context) => {
    const session = await createAuth().getSession.execute();
    context.actorId = session?.user.id ?? 0;
    return createProducts().productionPlan.execute(session, id, period);
  });
}
