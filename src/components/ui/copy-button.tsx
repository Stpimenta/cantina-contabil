"use client";

import styles from "./copy-button.module.css";

import { useState } from "react";
import { Button } from "./button";

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [busy, setBusy] = useState(false);

  async function copy() {
    if (busy) return;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="neutral" busy={busy} onClick={copy}>
        <span className={styles.feedback}>
          <span data-visible={state === "idle"}>Copiar erro</span>
          <span data-visible={state === "copied"}>Copiado</span>
          <span data-visible={state === "failed"}>Tentar copiar</span>
        </span>
      </Button>
      <span className="sr-only" role="status">
        {state === "copied"
          ? "Mensagem de erro e referência copiadas."
          : state === "failed"
            ? "Não foi possível copiar automaticamente. Você pode selecionar e copiar o texto do modal."
            : ""}
      </span>
    </>
  );
}
