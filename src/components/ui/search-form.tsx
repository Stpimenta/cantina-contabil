"use client";

import fieldStyles from "@/components/ui/field.module.css";

import styles from "./search-form.module.css";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Field } from "./field";
import { Button } from "./button";
import { Icon } from "./icon";

export function SearchForm({
  action,
  query,
  label,
  filters = {},
  actions,
  scroll = true,
}: {
  action: string;
  query: string;
  label: string;
  filters?: Record<string, string>;
  actions?: ReactNode;
  scroll?: boolean;
}) {
  const [value, setValue] = useState(query);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const inputId = useId();
  const [composing, setComposing] = useState(false);
  const latestValue = useRef(value);
  latestValue.current = value;
  const requested = useRef<{ query: string; value: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    const request = requested.current;
    if (request && request.query === query) {
      // A response must not replace text typed while navigation was pending.
      if (latestValue.current === request.value) setValue(query);
      requested.current = null;
    } else {
      setValue(query);
      requested.current = null;
    }
  }, [query]);
  const search = useCallback(
    (q: string, automatic = false) => {
      if (timer.current) clearTimeout(timer.current);
      if (pending || composing || q === query) return;
      const params = new URLSearchParams(JSON.parse(filterKey));
      if (q) params.set("q", q);
      else params.delete("q");
      params.delete("page");
      requested.current = { query: q, value: latestValue.current };
      startTransition(() =>
        router.replace(`${action}${params.size ? `?${params}` : ""}`, {
          scroll: automatic ? false : scroll,
        }),
      );
    },
    [pending, composing, query, filterKey, action, router, scroll],
  );
  useEffect(() => {
    if (pending || composing || value.trim() === query) return;
    timer.current = setTimeout(
      () => search(value.trim(), true),
      value ? 350 : 0,
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, query, pending, composing, search]);
  return (
    <div className={styles.root}>
      <form
        className={styles.form}
        aria-busy={pending}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          search(value.trim());
        }}
      >
        <Field
          id={inputId}
          name="q"
          label={label}
          hideLabel
          appearance="search"
          type="search"
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          placeholder={label}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={100}
          trailing={
            value ? (
              <Button
                type="button"
                variant="ghost"
                iconOnly
                className={fieldStyles.trailing}
                aria-label="Limpar busca"
                onClick={() => {
                  setValue("");
                  latestValue.current = "";
                  search("", true);
                  document.getElementById(inputId)?.focus();
                }}
              >
                <Icon name="close" />
              </Button>
            ) : undefined
          }
        />
        <Button
          type="submit"
          variant="primary"
          shape="search"
          iconOnly
          busy={pending}
          aria-label="Buscar"
          title="Buscar"
        >
          <Icon name="search" />
        </Button>
        <span className="sr-only" role="status">
          {pending ? "Buscando" : ""}
        </span>
      </form>
      {actions}
    </div>
  );
}
