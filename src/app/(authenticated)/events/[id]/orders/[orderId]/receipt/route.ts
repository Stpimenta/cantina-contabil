import { mapHttpError } from "@/shared/errors/http-error-mapper";
import { createAuth } from "@/server/auth/composition";
import { createEvents } from "@/server/events/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; orderId: string }> },
) {
  const { id, orderId } = await params;
  const result = await executeOperation(
    {
      operation: "event.order.receipt",
      message: "Não foi possível carregar o comprovante.",
      source:
        "src/app/(authenticated)/events/[id]/orders/[orderId]/receipt/route.ts",
      route: "/events/[id]/orders/[orderId]/receipt",
      method: "GET",
    },
    async () => {
      const session = await createAuth().getSession.execute();
      return createEvents().orderReceipt.execute(
        session,
        id,
        orderId,
        new URL(_request.url).searchParams.get("receiptId"),
      );
    },
  );
  if (!result.ok) {
    const { status, body } = mapHttpError(result.error);
    return Response.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
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
