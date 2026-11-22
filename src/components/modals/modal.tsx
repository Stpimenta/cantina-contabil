"use client";

import styles from "./modal.module.css";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { registerModal } from "./modal-session";

export function Modal({
  id,
  open,
  title,
  onClose,
  children,
  footer,
  variant = "standard",
  size = "standard",
  closeLabel = "Fechar",
  fullScreenOnMobile = false,
}: {
  id?: string;
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "standard" | "navigation";
  size?: "standard" | "wide" | "form" | "formCompact";
  closeLabel?: string;
  fullScreenOnMobile?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const backdropPress = useRef(false);
  function outside(dialog: HTMLDialogElement, x: number, y: number) {
    const rect = dialog.getBoundingClientRect();
    return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
  }
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const release = registerModal(dialog, previous);
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      try {
        dialog.close();
      } finally {
        release();
      }
    };
  }, [open]);

  return (
    <dialog
      id={id}
      ref={ref}
      className={`${styles.root}${variant === "navigation" ? ` ${styles.navigation}` : size === "wide" ? ` ${styles.wide}` : size === "form" ? ` ${styles.form}` : size === "formCompact" ? ` ${styles.formCompact}` : ""}${fullScreenOnMobile ? ` ${styles.fullScreenOnMobile}` : ""}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onPointerDown={(event) => {
        backdropPress.current =
          event.isPrimary &&
          event.button === 0 &&
          event.target === event.currentTarget &&
          outside(event.currentTarget, event.clientX, event.clientY);
      }}
      onPointerCancel={() => {
        backdropPress.current = false;
      }}
      onClick={(event) => {
        const startedOutside = backdropPress.current;
        backdropPress.current = false;
        if (
          startedOutside &&
          event.target === event.currentTarget &&
          outside(event.currentTarget, event.clientX, event.clientY) &&
          !window.getSelection()?.toString()
        ) {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className={styles.header}>
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className={styles.title}>
          {title}
        </h2>
        <Button
          type="button"
          variant="ghost"
          iconOnly
          aria-label={closeLabel}
          onClick={onClose}
        >
          <Icon name="close" />
        </Button>
      </div>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </dialog>
  );
}
