"use server";
import { redirect } from "next/navigation";
import { createAuth } from "../composition";
import { executeOperation } from "@/shared/errors/execute-operation";

export async function logoutAction() {
  return executeOperation(
    {
      operation: "auth.logout",
      message: "Não foi possível sair agora. Tente novamente.",
      source: "src/server/auth/actions/logout.action.ts",
      route: "/",
      method: "POST",
    },
    async () => {
      await createAuth().logout.execute();
      redirect("/login");
    },
  );
}
