import { createCanteen } from "@/server/canteen/composition";
import { commandIdentity } from "@/server/canteen/infrastructure/http-identity";
import { commandResponse } from "@/server/canteen/infrastructure/http-response";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params,
    url = new URL(request.url);
  return commandResponse(
    await executeOperation(
      {
        operation: "canteen.list",
        message: "Não foi possível carregar as comandas.",
        source: "src/app/api/events/[id]/commands/route.ts",
        route: "/api/events/[id]/commands",
        method: "GET",
      },
      async () =>
        createCanteen().list.execute(await commandIdentity(), id, {
          q: url.searchParams.get("q") ?? "",
          page: url.searchParams.get("page") ?? 1,
          collected: url.searchParams.get("collected") ?? "all",
        }),
    ),
  );
}
