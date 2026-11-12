import { createCanteen } from "@/server/canteen/composition";
import { commandIdentity } from "@/server/canteen/infrastructure/http-identity";
import { commandResponse } from "@/server/canteen/infrastructure/http-response";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; orderId: string }> },
) {
  const { id, orderId } = await params,
    url = new URL(request.url);
  return commandResponse(
    await executeOperation(
      {
        operation: "canteen.get",
        message: "Não foi possível carregar o pedido.",
        source: "src/app/api/eventos/[id]/comandas/[orderId]/route.ts",
        route: "/api/eventos/[id]/comandas/[orderId]",
        method: "GET",
      },
      async () => {
        const identity = await commandIdentity();
        return url.searchParams.has("window")
          ? createCanteen().window.execute(identity, id, orderId, {
              q: url.searchParams.get("q") ?? "",
              page: url.searchParams.get("page") ?? 1,
              collected: url.searchParams.get("collected") ?? "waiting",
            })
          : createCanteen().get.execute(identity, id, orderId);
      },
    ),
  );
}
