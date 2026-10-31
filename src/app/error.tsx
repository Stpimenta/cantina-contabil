"use client";

import styles from "@/components/modals/error-modal.module.css";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modals/modal";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(true), []);
  return (
    <main className="centered-page">
      <div className="stack">
        <h1>Não foi possível abrir esta página</h1>
        <p>Tente novamente em instantes.</p>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
      <Modal
        open={open}
        title="Não foi possível continuar"
        onClose={() => setOpen(false)}
        footer={
          <Button
            onClick={() => {
              setOpen(false);
              reset();
            }}
          >
            Tentar novamente
          </Button>
        }
      >
        <p>
          Ocorreu uma falha ao carregar a página. Tente novamente em instantes.
        </p>
        {error.digest && (
          <p className={styles.reference}>Referência: {error.digest}</p>
        )}
      </Modal>
    </main>
  );
}
