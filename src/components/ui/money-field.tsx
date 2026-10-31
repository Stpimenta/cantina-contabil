"use client";

import { Field } from "./field";
import { formatMoneyInput, maskMoneyInput } from "@/shared/masks/input-masks";
import { parseMoney } from "@/shared/validation/money-input";

export function MoneyField({
  id,
  name,
  label,
  value,
  onValueChange,
  error,
  disabled,
  required,
}: {
  id: string;
  name?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <>
      <Field
        id={id}
        label={label}
        type="text"
        inputMode="numeric"
        placeholder="0,00"
        autoComplete="off"
        value={formatMoneyInput(value)}
        required={required}
        disabled={disabled}
        error={error}
        onKeyDown={(event) => {
          if (
            (event.key === "Backspace" || event.key === "Delete") &&
            parseMoney(value) === 0
          ) {
            event.preventDefault();
            onValueChange("");
          }
        }}
        onChange={(event) => {
          const input = event.currentTarget;
          const masked = maskMoneyInput(input.value);
          if (masked === null) return;
          const digitsAfterCaret = input.value
            .slice(input.selectionStart ?? input.value.length)
            .replace(/\D/g, "").length;
          onValueChange(masked);
          requestAnimationFrame(() => {
            if (!input.isConnected || document.activeElement !== input) return;
            let position = input.value.length;
            let remaining = digitsAfterCaret;
            while (position > 0 && remaining > 0) {
              position--;
              if (/\d/.test(input.value[position])) remaining--;
            }
            input.setSelectionRange(position, position);
          });
        }}
      />
      {name && (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      )}
    </>
  );
}
