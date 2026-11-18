"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./error-modal.module.css";

import type { ApplicationError } from "@/shared/errors/application-error";
import { Modal } from "./modal";
import { Button } from "../ui/button";
import { CopyButton } from "../ui/copy-button";
import { Icon } from "../ui/icon";
import type { StockShortage } from "@/shared/errors/business-failure";

export function ErrorModal({
  error,
  onClose,
  onAddStock,
  busy = false,
}: {
  error: ApplicationError | null;
  onClose: () => void;
  onAddStock?: (item: StockShortage) => void;
  busy?: boolean;
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
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          {error && (
            <CopyButton
              key={`${error.code}:${error.reference ?? ""}`}
              text={[
                error.message,
                ...(error.stockShortages ?? []).map(
                  (item) =>
                    `${item.productName}: solicitado ${item.requested}, disponível ${item.available}, falta ${item.missing}`,
                ),
                error.reference ? `Referência: ${error.reference}` : "",
              ]
                .filter(Boolean)
                .join("\n\n")}
            />
          )}
          <Button disabled={busy} onClick={onClose}>
            Entendi
          </Button>
        </>
      }
    >
      <p>{error?.message}</p>
      {!!error?.stockShortages?.length && (
        <ul
          className={styles.shortages}
          aria-label="Produtos com estoque insuficiente"
        >
          {error.stockShortages.map((item) => (
            <li key={item.productId} className={styles.shortage}>
              <div className={styles.shortageHeading}>
                <strong>{item.productName}</strong>
              </div>
              <dl className={styles.quantities}>
                <div>
                  <dt>Solicitado</dt>
                  <dd>{item.requested}</dd>
                </div>
                <div>
                  <dt>Disponível</dt>
                  <dd>{item.available}</dd>
                </div>
                <div>
                  <dt>Falta</dt>
                  <dd>{item.missing}</dd>
                </div>
              </dl>
              {onAddStock && (
                <Button
                  variant="primary"
                  className={styles.shortageAction}
                  iconOnly
                  disabled={busy}
                  aria-label={`Adicionar ${item.missing} ao estoque de ${item.productName}`}
                  onClick={() => onAddStock(item)}
                >
                  <Icon name="plus" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error?.reference && (
        <p className={styles.reference}>Referência: {error.reference}</p>
      )}
    </Modal>
  );
}
