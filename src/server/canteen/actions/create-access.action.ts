"use server";
import { createAuth } from "@/server/auth/composition";
import { createCanteen } from "../composition";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function createAccessAction(eventId: string, input: unknown) {
  return executeOperation(
    {
      operation: "canteen.createAccess",
      message: "Não foi possível criar o acesso.",
      source: "src/server/canteen/actions/create-access.action.ts",
      route: "/eventos/[id]/comandas",
      method: "POST",
    },
    async () =>
      createCanteen().createAccess.execute(
        await createAuth().getSession.execute(),
        eventId,
        input,
      ),
  );
}
