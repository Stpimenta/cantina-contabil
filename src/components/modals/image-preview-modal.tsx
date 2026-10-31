"use client";
import { useEffect, useState } from "react";
import type { ApplicationError } from "@/shared/errors/application-error";
import { Modal } from "./modal";
import { ErrorModal } from "./error-modal";
import { Button } from "../ui/button";
import styles from "./image-preview-modal.module.css";
const unavailable: ApplicationError = {
  code: "IMAGE_PREVIEW_UNAVAILABLE",
  category: "unavailable",
  message: "Não foi possível carregar a imagem. Tente novamente.",
};
export function ImagePreviewModal({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<ApplicationError | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setImage(null);
    setLoading(true);
    setFailed(false);
    setError(null);
    function fail(value: ApplicationError) {
      setError(value);
      setFailed(true);
      setLoading(false);
    }
    async function load() {
      try {
        const response = await fetch(src, {
          signal: controller.signal,
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) {
          const result = await response.json();
          if (!controller.signal.aborted)
            fail(result.error?.message ? result.error : unavailable);
          return;
        }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(blob.type)) {
          fail(unavailable);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setImage(objectUrl);
      } catch {
        if (!controller.signal.aborted) fail(unavailable);
      }
    }
    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, attempt]);
  return (
    <>
      <Modal
        open
        title="Comprovante"
        size="form"
        onClose={onClose}
        footer={
          <Button variant="neutral" onClick={onClose}>
            Fechar
          </Button>
        }
      >
        <div className={styles.preview} aria-busy={loading}>
          {loading && (
            <p className="muted" role="status">
              Carregando comprovante…
            </p>
          )}
          {image && !failed && (
            <img
              className={styles.image}
              src={image}
              alt={alt}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
                setError(unavailable);
              }}
            />
          )}
          {failed && (
            <Button
              variant="neutral"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Tentar novamente
            </Button>
          )}
        </div>
      </Modal>
      <ErrorModal error={error} onClose={() => setError(null)} />
    </>
  );
}
