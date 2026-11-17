"use client";
import { useRef, useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { requestAccountRecoveryAction } from "@/server/auth/actions/account-enrollment.action";
import { validateAccountEmail } from "@/server/auth/inputs/account-enrollment.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/modals/error-modal";
export function RecoveryForm() {
  const form = useRef<HTMLFormElement>(null),
    [sent, setSent] = useState(false),
    [ready, setReady] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => setReady(true), []);
  const action = useServerAction({
    connectionMessage: "Não foi possível solicitar a recuperação agora.",
    fieldIds: { email: "email" },
    validationKey: String(revision),
    validate: () => {
      const result = validateAccountEmail({
        email: form.current ? new FormData(form.current).get("email") : null,
      });
      return result.ok ? null : presentBusinessFailure(result.error);
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (ready)
      action.execute(
        () => requestAccountRecoveryAction(data),
        () => setSent(true),
      );
  }
  return (
    <div className="stack">
      {sent ? (
        <p role="status">
          Se houver uma conta ativa para esse e-mail, você receberá um link para
          definir uma nova senha.
        </p>
      ) : (
        <form
          ref={form}
          className="stack"
          method="post"
          action="/auth/recover"
          noValidate
          onSubmit={submit}
          onInput={() => setRevision((r) => r + 1)}
        >
          <Field
            id="email"
            name="email"
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            disabled={action.pending}
            error={action.fields?.email}
          />
          <Button type="submit" disabled={!ready} busy={action.pending}>
            Enviar link de recuperação
          </Button>
        </form>
      )}
      <Link href="/login" className="text-link">
        Voltar para entrar
      </Link>
      <ErrorModal error={action.error} onClose={action.closeError} />
    </div>
  );
}
