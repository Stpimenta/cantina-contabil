"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { completeAccountPasswordAction } from "@/server/auth/actions/account-enrollment.action";
import { validateOwnPassword } from "@/server/auth/inputs/account-enrollment.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/modals/error-modal";
export function OwnPasswordForm() {
  const form = useRef<HTMLFormElement>(null),
    [ready, setReady] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => setReady(true), []);
  const action = useServerAction({
    connectionMessage:
      "Não foi possível salvar. Tente entrar com sua nova senha antes de repetir.",
    fieldIds: { password: "password", confirmation: "confirmation" },
    validationKey: String(revision),
    validate: () => {
      const data = form.current ? new FormData(form.current) : null,
        result = validateOwnPassword({
          password: data?.get("password"),
          confirmation: data?.get("confirmation"),
        });
      return result.ok ? null : presentBusinessFailure(result.error);
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (ready) action.execute(() => completeAccountPasswordAction(data));
  }
  return (
    <>
      <form
        ref={form}
        method="post"
        action="/auth/password"
        className="stack"
        noValidate
        onSubmit={submit}
        onInput={() => setRevision((r) => r + 1)}
        aria-label="Definir senha própria"
      >
        <PasswordField
          id="password"
          name="password"
          label="Nova senha"
          disabled={action.pending}
          error={action.fields?.password}
        />
        <PasswordField
          id="confirmation"
          name="confirmation"
          label="Confirmar nova senha"
          disabled={action.pending}
          error={action.fields?.confirmation}
        />
        <Button type="submit" disabled={!ready} busy={action.pending}>
          Salvar senha e entrar
        </Button>
      </form>
      <ErrorModal error={action.error} onClose={action.closeError} />
    </>
  );
}
