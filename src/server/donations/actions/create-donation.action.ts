"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createDonations } from "../composition";

export async function createDonationAction(form: FormData) {
  return executeOperation(
    {
      operation: "donation.create",
      message:
        "Não foi possível confirmar o registro da doação. Confira a lista antes de tentar novamente.",
      source: "src/server/donations/actions/create-donation.action.ts",
      route: "/doacoes",
      method: "POST",
    },
    async (context) => {
      const input = {
        cashBoxId: form.get("cashBoxId"),
        amount: form.get("amount"),
        donatedOn: form.get("donatedOn"),
        donorName: form.get("donorName"),
        note: form.get("note"),
      };
      const requestId = form.get("requestId");
      if (typeof requestId === "string") context.requestId = requestId;
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const value = await createDonations().create.execute(
        session,
        requestId,
        input,
      );
      context.cashBoxId = value.cashBoxId;
      revalidatePath("/doacoes");
      revalidatePath("/caixas");
      revalidatePath(`/caixas/${value.cashBoxId}`);
      return value;
    },
  );
}
