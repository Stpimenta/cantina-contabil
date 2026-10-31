"use client";

import styles from "./filter-form.module.css";
import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { Icon } from "./icon";

export function FilterForm({
  action,
  fixedParams = {},
  resetParams = {},
  canReset = true,
  children,
}: {
  action: string;
  fixedParams?: Record<string, string>;
  resetParams?: Record<string, string>;
  canReset?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(values: FormData | Record<string, string>) {
    if (pending) return;
    const params = new URLSearchParams(fixedParams);
    const entries =
      values instanceof FormData ? values.entries() : Object.entries(values);
    for (const [key, value] of entries)
      if (typeof value === "string" && value) params.set(key, value);
    startTransition(() =>
      router.push(`${action}${params.size ? `?${params}` : ""}`, {
        scroll: false,
      }),
    );
  }

  return (
    <form
      className={styles.root}
      noValidate
      onInput={(event) => navigate(new FormData(event.currentTarget))}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(new FormData(event.currentTarget));
      }}
    >
      <fieldset
        className={styles.fields}
        disabled={pending}
        aria-label="Filtros"
      >
        {children}
        <Button
          type="button"
          variant="ghost"
          iconOnly
          busy={pending}
          disabled={!canReset}
          aria-label="Limpar filtros"
          title="Limpar filtros"
          onClick={() => navigate(resetParams)}
        >
          <Icon name="reset" />
        </Button>
      </fieldset>
      <span className="sr-only" role="status">
        {pending ? "Atualizando filtros" : ""}
      </span>
    </form>
  );
}
