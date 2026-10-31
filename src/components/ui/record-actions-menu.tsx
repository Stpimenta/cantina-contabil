"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import styles from "./record-actions-menu.module.css";
export function RecordActionsMenu({
  name,
  disabled,
  onDetails,
  onEdit,
  onDelete,
}: {
  name: string;
  disabled: boolean;
  onDetails?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [anchored, setAnchored] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setAnchored(
      CSS.supports("position-area", "bottom") &&
        "showPopover" in HTMLElement.prototype,
    );
  }, []);
  function close(restore = false) {
    if (anchored) popup.current?.hidePopover();
    setOpen(false);
    if (restore) trigger.current?.focus();
  }
  useEffect(() => {
    if (!open || anchored) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, anchored]);
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const buttons = Array.from(
        popup.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
      );
      const index = buttons.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
              buttons.length;
      buttons[next]?.focus();
    }
  }
  return (
    <div
      ref={root}
      className={styles.root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <Button
        ref={trigger}
        type="button"
        variant="ghost"
        iconOnly
        disabled={disabled}
        popoverTarget={anchored ? id : undefined}
        aria-label={`Mais ações de ${name}`}
        title="Mais ações"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (!anchored) {
            setOpen(!open);
            if (!open)
              requestAnimationFrame(() =>
                popup.current
                  ?.querySelector<HTMLButtonElement>("button")
                  ?.focus(),
              );
          }
        }}
      >
        <Icon name="more" />
      </Button>
      <div
        id={id}
        ref={popup}
        popover={anchored ? "auto" : undefined}
        hidden={!anchored && !open}
        className={`${styles.popup}${anchored ? "" : ` ${styles.fallback}`}`}
        aria-label={`Ações de ${name}`}
        onKeyDown={keyboard}
        onToggle={(event) => {
          setOpen(event.newState === "open");
          if (event.newState === "open")
            popup.current?.querySelector<HTMLButtonElement>("button")?.focus();
        }}
      >
        {onDetails && (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => {
              close(true);
              onDetails();
            }}
          >
            <span className={styles.optionContent}>
              <Icon name="eye" />
              <span>Detalhes</span>
            </span>
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => {
            close(true);
            onEdit();
          }}
        >
          <span className={styles.optionContent}>
            <Icon name="edit" />
            <span>Editar</span>
          </span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => {
            close(true);
            onDelete();
          }}
        >
          <span className={styles.optionContent}>
            <Icon name="trash" />
            <span>Excluir</span>
          </span>
        </Button>
      </div>
    </div>
  );
}
