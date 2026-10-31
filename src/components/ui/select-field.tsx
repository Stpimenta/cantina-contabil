"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import fieldStyles from "./field.module.css";
import styles from "./select-field.module.css";
import { Button } from "./button";
import { Icon } from "./icon";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function SelectField({
  id,
  label,
  name,
  value,
  defaultValue,
  options,
  onValueChange,
  disabled = false,
  required = false,
  error,
}: {
  id: string;
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: readonly SelectOption[];
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}) {
  const [localValue, setLocalValue] = useState(
    defaultValue ?? options[0]?.value ?? "",
  );
  const [open, setOpen] = useState(false);
  const [anchored, setAnchored] = useState(true);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", time: 0 });
  const selectedValue = value ?? localValue;
  const selected = options.findIndex(
    (option) => option.value === selectedValue,
  );
  const listId = `${id}-options`;
  const isDisabled = disabled || !options.some((option) => !option.disabled);

  useEffect(() => {
    // Sem posicionamento por âncora, a lista permanece abaixo do campo no fluxo,
    // dentro da rolagem do modal; nunca usar coordenadas inline ou seletor do SO.
    setAnchored(
      CSS.supports("position-area", "bottom") &&
        "showPopover" in HTMLElement.prototype,
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${id}-option-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);

  useEffect(() => {
    if (!open || anchored) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, anchored]);

  function close(restoreFocus = false) {
    if (anchored && popup.current?.matches(":popover-open"))
      popup.current.hidePopover();
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled || trigger.current?.matches(":disabled"))
      return;
    close(true);
    if (option.value === selectedValue) return;
    setLocalValue(option.value);
    // O evento input chega ao FilterForm após o valor entrar no FormData.
    if (input.current) input.current.value = option.value;
    onValueChange?.(option.value);
    input.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function openAt(index: number) {
    if (!open) trigger.current?.click();
    setActive(index);
  }

  function keyboard(event: KeyboardEvent) {
    if (isDisabled) return;
    const enabled = options
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0);
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === "Tab") {
      close();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const current = enabled.indexOf(active);
      const next =
        event.key === "Home"
          ? enabled[0]
          : event.key === "End"
            ? enabled.at(-1)!
            : !open
              ? enabled.includes(selected)
                ? selected
                : enabled[0]
              : enabled[
                  (current +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    enabled.length) %
                    enabled.length
                ];
      openAt(next);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else openAt(enabled.includes(selected) ? selected : enabled[0]);
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const normalize = (text: string) =>
        text
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLocaleLowerCase("pt-BR");
      const char = normalize(event.key);
      const now = Date.now();
      const text =
        now - typed.current.time > 700 || typed.current.text === char
          ? char
          : typed.current.text + char;
      typed.current = { text, time: now };
      const start = text.length === 1 ? active + 1 : active;
      const match = options
        .map((_, offset) => (start + offset) % options.length)
        .find(
          (index) =>
            !options[index].disabled &&
            normalize(options[index].label).startsWith(text),
        );
      if (match !== undefined) {
        event.preventDefault();
        openAt(match);
      }
    }
  }

  const list = (
    <div
      id={listId}
      ref={popup}
      popover={anchored ? "auto" : undefined}
      hidden={!anchored && !open}
      className={`${styles.list}${anchored ? "" : ` ${styles.fallback}`}`}
      role="listbox"
      aria-labelledby={`${id}-label`}
      onKeyDown={keyboard}
      onToggle={(event) => setOpen(event.newState === "open")}
    >
      {options.map((option, index) => (
        <Button
          key={option.value}
          id={`${id}-option-${index}`}
          type="button"
          variant="ghost"
          className="full-width"
          role="option"
          tabIndex={-1}
          aria-selected={option.value === selectedValue}
          disabled={option.disabled}
          data-active={index === active}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => choose(index)}
        >
          <span className={styles.optionContent}>
            <span>{option.label}</span>
            {option.value === selectedValue && <Icon name="check" />}
          </span>
        </Button>
      ))}
    </div>
  );

  return (
    <div
      ref={root}
      className={fieldStyles.root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <label id={`${id}-label`} htmlFor={id}>
        {label}
      </label>
      <input
        ref={input}
        type="hidden"
        name={name}
        value={selectedValue}
        disabled={isDisabled}
      />
      <Button
        id={id}
        ref={trigger}
        type="button"
        variant="neutral"
        className="full-width"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-required={required || undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        disabled={isDisabled}
        popoverTarget={anchored ? listId : undefined}
        onKeyDown={keyboard}
        onClick={() => {
          setActive(
            selected >= 0 && !options[selected].disabled
              ? selected
              : Math.max(
                  0,
                  options.findIndex((option) => !option.disabled),
                ),
          );
          if (!anchored) setOpen((current) => !current);
        }}
      >
        <span className={styles.selection}>
          <span id={`${id}-value`} className={styles.value}>
            {options[selected]?.label ?? "Selecione"}
          </span>
          <Icon name="chevronDown" />
        </span>
      </Button>
      {list}
      {error && (
        <p className={fieldStyles.error} id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
