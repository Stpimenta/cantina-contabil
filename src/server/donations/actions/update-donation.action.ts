"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createDonations } from "../composition";
export async function updateDonationAction(form: FormData) {
  return executeOperation(
    {
      operation: "donation.update",
      message:
        "Não foi possível confirmar a operação. Confira as doações antes de tentar novamente.",
      source: "src/server/donations/actions/update-donation.action.ts",
      route: "/doacoes",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const result = await createDonations().update.execute(
        session,
        { id: form.get("id"), version: Number(form.get("version")) },
        {
          cashBoxId: form.get("cashBoxId"),
          amount: form.get("amount"),
          donatedOn: form.get("donatedOn"),
          donorName: form.get("donorName"),
          note: form.get("note"),
        },
      );
      revalidatePath("/doacoes");
      revalidatePath("/caixas", "layout");
      return result;
    },
  );
}
