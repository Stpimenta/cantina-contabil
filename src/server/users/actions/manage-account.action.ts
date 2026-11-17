"use server";
import { revalidatePath } from "next/cache";
import { createAuth } from "@/server/auth/composition";
import { createUsers } from "../composition";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function manageAccountAction(input: unknown) {
  return executeOperation(
    {
      operation: "users.manage",
      message:
        "Não foi possível salvar o acesso. Confira os dados antes de repetir.",
      source: "src/server/users/actions/manage-account.action.ts",
      route: "/users",
      method: "POST",
    },
    async () => {
      await createUsers().manage.execute(
        await createAuth().getSession.execute(),
        input,
      );
      revalidatePath("/users");
    },
  );
}
export async function inviteAccountAction(input: unknown) {
  return executeOperation(
    {
      operation: "users.invite",
      message:
        "Não foi possível enviar o convite. Confira a lista e o e-mail antes de repetir.",
      source: "src/server/users/actions/manage-account.action.ts",
      route: "/users",
      method: "POST",
    },
    async () => {
      await createUsers().invite.execute(
        await createAuth().getSession.execute(),
        input,
      );
      revalidatePath("/users");
    },
  );
}
export async function cancelAccountInvitationAction(input: unknown) {
  return executeOperation(
    {
      operation: "users.cancel-invitation",
      message:
        "Não foi possível cancelar o convite. Atualize a lista antes de repetir.",
      source: "src/server/users/actions/manage-account.action.ts",
      route: "/users",
      method: "POST",
    },
    async () => {
      await createUsers().cancel.execute(
        await createAuth().getSession.execute(),
        input,
      );
      revalidatePath("/users");
    },
  );
}
