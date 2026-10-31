"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./error-modal.module.css";

import type { ApplicationError } from "@/shared/errors/application-error";
import { Modal } from "./modal";
import { Button } from "../ui/button";
import { CopyButton } from "../ui/copy-button";

export function ErrorModal({
  error,
  onClose,
}: {
  error: ApplicationError | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const expired =
    error?.code === "SESSION_EXPIRED" && error.category === "unauthenticated";
  useEffect(() => {
    if (expired) router.replace("/login");
  }, [expired, router]);
  return (
    <Modal
      open={!!error && !expired}
      title={
        error?.category === "forbidden"
          ? "Acesso não permitido"
          : "Não foi possível continuar"
      }
      onClose={onClose}
      footer={
        <>
          {error && (
            <CopyButton
              key={`${error.code}:${error.reference ?? ""}`}
              text={[
                error.message,
                error.reference ? `Referência: ${error.reference}` : "",
              ]
                .filter(Boolean)
                .join("\n\n")}
            />
          )}
          <Button onClick={onClose}>Entendi</Button>
        </>
      }
    >
      <p>{error?.message}</p>
      {error?.reference && (
        <p className={styles.reference}>Referência: {error.reference}</p>
      )}
    </Modal>
  );
}
