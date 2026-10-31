"use server";
import { redirect } from "next/navigation";
import { createAuth } from "../composition";
import { executeOperation } from "@/shared/errors/execute-operation";

export async function loginAction(formData: FormData) {
  return executeOperation(
    {
      operation: "auth.login",
      message: "Não foi possível entrar agora. Tente novamente em instantes.",
      source: "src/server/auth/actions/login.action.ts",
      route: "/login",
      method: "POST",
    },
    async () => {
      const gmail = formData.get("gmail");
      const senha = formData.get("senha");
      await createAuth().login.execute({ gmail, senha });
      redirect("/");
    },
  );
}
