"use server";
import { createAuth } from "@/server/auth/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { createAddresses } from "../composition";
export async function lookupPostalCodeAction(input: unknown) {
  return executeOperation(
    {
      operation: "address.lookupPostalCode",
      message:
        "Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.",
      source: "src/server/addresses/actions/lookup-postal-code.action.ts",
      route: "/eventos",
      method: "POST",
    },
    async (context) => {
      const session = await createAuth().getSession.execute();
      context.actorId = session?.user.id ?? 0;
      return createAddresses().lookupPostalCode.execute(session, input);
    },
  );
}
