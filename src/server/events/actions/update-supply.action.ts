"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createEvents } from "../composition";
export async function updateSupplyAction(
  eventId: string,
  id: string,
  form: FormData,
) {
  return executeOperation(
    {
      operation: "event.supply.update",
      message:
        "Não foi possível confirmar a alteração. Confira os insumos antes de tentar novamente.",
      source: "src/server/events/actions/update-supply.action.ts",
      route: "/eventos/[id]/insumos",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const files = form
        .getAll("receipts")
        .filter(
          (entry): entry is File => entry instanceof File && entry.size > 0,
        );
      const value = await createEvents().updateSupply.execute(
        session,
        eventId,
        id,
        {
          version: Number(form.get("version")),
          retainedReceiptIds: form.getAll("retainedReceiptIds"),
          name: form.get("name"),
          donorName: form.get("donorName") ?? "",
          description: form.get("description") ?? "",
          icon: form.get("icon"),
          amount: form.get("amount"),
          source: form.get("source"),
          cashBoxId: form.get("cashBoxId") || null,
          received: form.get("received") === "true",
        },
        files,
      );
      revalidatePath(`/eventos/${eventId}`);
      revalidatePath(`/eventos/${eventId}/insumos`);
      revalidatePath("/caixas", "layout");
      return { id: value.id };
    },
  );
}
