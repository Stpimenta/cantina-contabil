"use client";

import styles from "./toast-provider.module.css";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./button";
import { Icon } from "./icon";

const TOAST_DURATION_MS = 3000;
type ToastVariant = "success" | "warning" | "critical";
type Notify = (message: string, variant?: ToastVariant) => void;
const labels: Record<ToastVariant, string> = {
  success: "Sucesso",
  warning: "Atenção",
  critical: "Crítico",
};
const ToastContext = createContext<Notify | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState<ToastVariant>("success");
  const [closing, setClosing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);
  const notify = useCallback((text: string, kind: ToastVariant = "success") => {
    setClosing(false);
    setMessage(text);
    setVariant(kind);
    setRevision((current) => current + 1);
    setPaused(false);
  }, []);

  useEffect(() => {
    if (!message || paused || closing) return;
    const timer = setTimeout(() => setClosing(true), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, paused, revision, closing]);

  useEffect(() => {
    if (!closing) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const finishWithoutMotion = () => {
      if (motion.matches) setMessage("");
    };
    finishWithoutMotion();
    motion.addEventListener("change", finishWithoutMotion);
    return () => motion.removeEventListener("change", finishWithoutMotion);
  }, [closing]);

  const notification = message ? (
    <div
      key={revision}
      className={`${styles.toast} ${styles[variant]}${closing ? ` ${styles.closing}` : ""}`}
      onAnimationEnd={(event) => {
        if (closing && event.target === event.currentTarget) setMessage("");
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setPaused(false);
      }}
    >
      <p>
        <span className="sr-only">{labels[variant]}: </span>
        {message}
      </p>
      <Button
        variant="ghost"
        iconOnly
        aria-label="Fechar notificação"
        onClick={() => {
          setClosing(true);
          setPaused(false);
        }}
      >
        <Icon name="close" />
      </Button>
    </div>
  ) : null;

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className={styles.region}>
        <div role="status" aria-live="polite" aria-atomic="true">
          {variant !== "critical" ? notification : null}
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true">
          {variant === "critical" ? notification : null}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify)
    throw new Error("useToast deve ser usado dentro de ToastProvider");
  return notify;
}
