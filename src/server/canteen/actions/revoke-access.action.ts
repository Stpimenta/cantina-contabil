"use server";
import { createAuth } from "@/server/auth/composition";
import { createCanteen } from "../composition";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function revokeAccessAction(
  eventId: string,
  id: string,
  operation: string,
) {
  return executeOperation(
    {
      operation: "canteen.revokeAccess",
      message:
        "Não foi possível confirmar a revogação. Confira o acesso antes de repetir.",
      source: "src/server/canteen/actions/revoke-access.action.ts",
      route: "/eventos/[id]/comandas",
      method: "POST",
    },
    async () =>
      createCanteen().revoke.execute(
        await createAuth().getSession.execute(),
        eventId,
        id,
        operation,
      ),
  );
}
