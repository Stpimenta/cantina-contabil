"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createDonations } from "../composition";
export async function deleteDonationAction(form: FormData) {
  return executeOperation(
    {
      operation: "donation.delete",
      message:
        "Não foi possível confirmar a operação. Confira as doações antes de tentar novamente.",
      source: "src/server/donations/actions/delete-donation.action.ts",
      route: "/doacoes",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      const result = await createDonations().delete.execute(session, {
        id: form.get("id"),
        version: Number(form.get("version")),
      });
      revalidatePath("/doacoes");
      revalidatePath("/caixas", "layout");
      return result;
    },
  );
}
