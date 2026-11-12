"use client";
import type { ComponentProps } from "react";
import { Field } from "./field";
import {
  maskBrazilianPhone,
  maskBrazilianPostalCode,
} from "@/shared/masks/input-masks";

type Props = Omit<
  ComponentProps<typeof Field>,
  "value" | "onChange" | "type" | "inputMode" | "maxLength"
> & {
  kind: "postalCode" | "phone";
  value: string;
  onValueChange: (value: string) => void;
};
export function BrazilianMaskedField({
  kind,
  value,
  onValueChange,
  ...props
}: Props) {
  const mask =
    kind === "postalCode" ? maskBrazilianPostalCode : maskBrazilianPhone;
  const text = mask(value);
  return (
    <Field
      {...props}
      type={kind === "phone" ? "tel" : "text"}
      inputMode={kind === "phone" ? "tel" : "numeric"}
      value={text}
      onKeyDown={(event) => {
        const input = event.currentTarget;
        const position = input.selectionStart ?? 0;
        if (
          input.selectionEnd !== position ||
          !["Backspace", "Delete"].includes(event.key)
        )
          return;
        const backwards = event.key === "Backspace";
        const adjacent = backwards ? position - 1 : position;
        if (
          adjacent < 0 ||
          adjacent >= text.length ||
          /\d/.test(text[adjacent])
        )
          return;
        event.preventDefault();
        let digit = adjacent;
        while (digit >= 0 && digit < text.length && !/\d/.test(text[digit]))
          digit += backwards ? -1 : 1;
        if (digit < 0 || digit >= text.length) return;
        const next = mask(text.slice(0, digit) + text.slice(digit + 1));
        const remaining = text.slice(digit + 1).replace(/\D/g, "").length;
        onValueChange(next);
        restoreCaret(input, remaining);
      }}
      onChange={(event) => {
        const input = event.currentTarget;
        const remaining = input.value
          .slice(input.selectionStart ?? input.value.length)
          .replace(/\D/g, "").length;
        onValueChange(mask(input.value));
        restoreCaret(input, remaining);
      }}
    />
  );
}
function restoreCaret(input: HTMLInputElement, digitsAfter: number) {
  requestAnimationFrame(() => {
    if (!input.isConnected || document.activeElement !== input) return;
    let position = input.value.length;
    while (position > 0 && digitsAfter > 0) {
      position--;
      if (/\d/.test(input.value[position])) digitsAfter--;
    }
    input.setSelectionRange(position, position);
  });
}
