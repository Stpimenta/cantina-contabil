"use client";

import { unstable_rethrow } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type {
  ApplicationError,
  Result,
} from "@/shared/errors/application-error";

interface ActionOptions {
  connectionMessage: string;
  fieldIds?: Record<string, string>;
  validationKey?: string;
  validate?: () => ApplicationError | null;
  onServerError?: (error: ApplicationError) => void;
}

export function useServerAction(options: ActionOptions) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ApplicationError | null>(null);
  const [fields, setFields] = useState<ApplicationError["fields"]>({});
  const running = useRef(false);
  const validating = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function focusField(value: ApplicationError["fields"]) {
    const field = Object.keys(options.fieldIds ?? {}).find(
      (key) => value?.[key],
    );
    const id = field ? options.fieldIds?.[field] : undefined;
    if (id)
      requestAnimationFrame(() => {
        if (mounted.current) document.getElementById(id)?.focus();
      });
  }

  function showError(value: ApplicationError) {
    const inline =
      value.category === "validation" &&
      Object.keys(value.fields ?? {}).some((key) => options.fieldIds?.[key]);
    validating.current = inline;
    setFields(value.fields ?? {});
    setError(inline ? null : value);
    if (inline) focusField(value.fields);
  }

  // Once submitted, recheck the shared input rules whenever form values change.
  useEffect(() => {
    if (!validating.current || !options.validate) return;
    const next = options.validate()?.fields ?? {};
    setFields((current) =>
      JSON.stringify(current) === JSON.stringify(next) ? current : next,
    );
  }, [options.validationKey]);

  function closeError() {
    setError(null);
    focusField(fields);
  }

  function execute<T>(
    action: () => Promise<Result<T>>,
    onSuccess?: (value: T) => void,
  ) {
    if (running.current || pending) return;
    const invalid = options.validate?.();
    if (invalid) {
      showError(invalid);
      return;
    }
    validating.current = true;
    running.current = true;
    setError(null);
    setFields({});
    startTransition(async () => {
      // A captura cobre somente a chamada remota. Erros de callbacks locais
      // seguem para o Error Boundary, sem alegar falha de conexão após sucesso.
      let result: Result<T>;
      try {
        result = await action();
      } catch (cause) {
        // Preserve Next navigation signals instead of showing a connection error.
        unstable_rethrow(cause);
        if (mounted.current)
          showError({
            code: "CONNECTION_ERROR",
            category: "unavailable",
            message: options.connectionMessage,
          });
        return;
      } finally {
        running.current = false;
      }
      if (!mounted.current) return;
      if (result.ok) onSuccess?.(result.value);
      else {
        showError(result.error);
        options.onServerError?.(result.error);
      }
    });
  }

  return {
    execute,
    pending,
    error,
    fields,
    showError,
    closeError,
    isPending: () => running.current || pending,
  };
}
