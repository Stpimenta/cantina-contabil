import { createAuth } from "@/server/auth/composition";
import { createEvents } from "@/server/events/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; supplyId: string }> },
) {
  const { id, supplyId } = await params;
  const result = await executeOperation(
    {
      operation: "event.supply.receipt",
      message: "Não foi possível carregar o comprovante.",
      source:
        "src/app/(authenticated)/eventos/[id]/insumos/[supplyId]/comprovante/route.ts",
      route: "/eventos/[id]/insumos/[supplyId]/comprovante",
      method: "GET",
    },
    async () => {
      const session = await createAuth().getSession.execute();
      return createEvents().receipt.execute(
        session,
        id,
        supplyId,
        new URL(_request.url).searchParams.get("receiptId"),
      );
    },
  );
  if (!result.ok) {
    const status =
      result.error.category === "unauthenticated"
        ? 401
        : result.error.category === "forbidden"
          ? 403
          : result.error.category === "not_found"
            ? 404
            : 500;
    return Response.json(
      { error: result.error },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  return new Response(result.value.body, {
    headers: {
      "Content-Type": result.value.type,

      "Content-Disposition":
        result.value.type === "application/pdf"
          ? "attachment; filename=comprovante.pdf"
          : "inline; filename=comprovante",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
