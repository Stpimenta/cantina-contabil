"use client";
import { validateLogin } from "@/server/auth/inputs/login.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";

import fieldStyles from "@/components/ui/field.module.css";

import { useRef, useState, type FormEvent } from "react";
import { loginAction } from "@/server/auth/actions/login.action";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { ErrorModal } from "@/components/modals/error-modal";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [revision, setRevision] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const { execute, pending, error, fields, closeError } = useServerAction({
    validationKey: String(revision),
    validate: () => {
      const data = form.current ? new FormData(form.current) : null;
      const result = validateLogin({
        gmail: data?.get("gmail"),
        senha: data?.get("senha"),
      });
      return result.ok ? null : presentBusinessFailure(result.error);
    },
    connectionMessage:
      "Não foi possível conectar. Verifique sua conexão e tente novamente.",
    fieldIds: { gmail: "gmail", senha: "senha" },
    onServerError: (error) => {
      if (error.category === "validation") return;
      const password = form.current?.elements.namedItem("senha");
      if (password instanceof HTMLInputElement) password.value = "";
      setShowPassword(false);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    execute(() => loginAction(data));
  }

  return (
    <>
      <form
        ref={form}
        className="stack"
        onSubmit={submit}
        onInput={() => setRevision((current) => current + 1)}
        noValidate
        aria-label="Entrar no aplicativo"
      >
        <Field
          id="gmail"
          name="gmail"
          type="email"
          label="E-mail"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          error={fields?.gmail}
          disabled={pending}
        />
        <Field
          id="senha"
          name="senha"
          type={showPassword ? "text" : "password"}
          label="Senha"
          autoComplete="current-password"
          required
          maxLength={1024}
          error={fields?.senha}
          disabled={pending}
          trailing={
            <Button
              type="button"
              variant="ghost"
              iconOnly
              className={fieldStyles.trailing}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
              disabled={pending}
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} />
            </Button>
          }
        />
        <Button type="submit" className="full-width" busy={pending}>
          {pending ? "Entrando…" : "Entrar"}
          <Icon name="arrow" />
        </Button>
        <span className="sr-only" role="status">
          {pending ? "Verificando seu acesso" : ""}
        </span>
      </form>
      <ErrorModal error={error} onClose={closeError} />
    </>
  );
}
