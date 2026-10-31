import { createAuth } from "@/server/auth/composition";
import { createMovements } from "@/server/movements/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await executeOperation(
    {
      operation: "movement.receipt",
      message: "Não foi possível carregar o comprovante.",
      source: "src/app/(authenticated)/movimentacoes/[id]/comprovante/route.ts",
      route: "/movimentacoes/[id]/comprovante",
      method: "GET",
    },
    async () => {
      const session = await createAuth().getSession.execute();
      return createMovements().receipt.execute(session, {
        id,
        receiptId: new URL(_request.url).searchParams.get("receiptId"),
      });
    },
  );
  if (!result.ok) {
    const status =
      result.error.category === "unauthenticated"
        ? 401
        : result.error.category === "forbidden"
          ? 403
          : result.error.category === "not_found" ||
              result.error.code === "RECEIPT_NOT_FOUND"
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
