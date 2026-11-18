"use server";
import { redirect } from "next/navigation";
import { createAuth } from "../composition";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function activateAccountAction(form: FormData) {
  return executeOperation(
    {
      operation: "auth.activate",
      message:
        "Não foi possível preparar sua conta. Confira seu e-mail antes de tentar novamente.",
      source: "src/server/auth/actions/account-enrollment.action.ts",
      route: "/auth/activate",
      method: "POST",
    },
    () =>
      createAuth().activate.execute({
        gmail: form.get("gmail"),
        senha: form.get("senha"),
      }),
  );
}
export async function confirmAccountEmailAction(input: {
  tokenHash: string;
  type: string;
}) {
  return executeOperation(
    {
      operation: "auth.confirm",
      message: "Não foi possível confirmar este link. Tente novamente.",
      source: "src/server/auth/actions/account-enrollment.action.ts",
      route: "/auth/confirm",
      method: "POST",
    },
    async () => {
      await createAuth().confirm.execute(input);
      redirect("/auth/password");
    },
  );
}
export async function completeAccountPasswordAction(form: FormData) {
  return executeOperation(
    {
      operation: "auth.password",
      message:
        "Não foi possível concluir. Tente entrar com sua nova senha antes de repetir.",
      source: "src/server/auth/actions/account-enrollment.action.ts",
      route: "/auth/password",
      method: "POST",
    },
    async () => {
      await createAuth().password.execute({
        fullName: form.get("fullName") ?? undefined,
        password: form.get("password"),
        confirmation: form.get("confirmation"),
      });
      redirect("/");
    },
  );
}
export async function requestAccountRecoveryAction(form: FormData) {
  return executeOperation(
    {
      operation: "auth.recover",
      message:
        "Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.",
      source: "src/server/auth/actions/account-enrollment.action.ts",
      route: "/auth/recover",
      method: "POST",
    },
    () => createAuth().recover.execute({ email: form.get("email") }),
  );
}
