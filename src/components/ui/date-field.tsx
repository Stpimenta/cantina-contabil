"use client";
import { useEffect, useRef, useState } from "react";
import { Field } from "./field";
import { Button } from "./button";
import { Icon } from "./icon";
import { DatePicker } from "./date-picker";
import fieldStyles from "./field.module.css";
import { maskBrazilianDate } from "@/shared/masks/input-masks";
import { formatDateOnly } from "@/shared/formatting/date-time";
import { parseBrazilianDate } from "@/shared/dates/date-only";
export function DateField({
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
  name: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [text, setText] = useState(() => (value ? formatDateOnly(value) : ""));
  const emitted = useRef(value);
  const [calendarOpen, setCalendarOpen] = useState(false);
  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setText(value ? formatDateOnly(value) : "");
    }
  }, [value]);
  return (
    <>
      <Field
        id={id}
        label={label}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        autoComplete="off"
        value={text}
        required={required}
        disabled={disabled}
        error={error}
        trailing={
          <Button
            type="button"
            variant="ghost"
            iconOnly
            className={fieldStyles.trailing}
            disabled={disabled}
            aria-label={`Abrir calendário — ${label}`}
            title="Abrir calendário"
            aria-haspopup="dialog"
            aria-expanded={calendarOpen}
            aria-controls={calendarOpen ? `${id}-calendar` : undefined}
            onClick={() => setCalendarOpen(true)}
          >
            <Icon name="calendar" />
          </Button>
        }
        onChange={(event) => {
          const masked = maskBrazilianDate(event.target.value);
          setText(masked);
          const date = parseBrazilianDate(masked) ?? "";
          emitted.current = date;
          onValueChange(date);
        }}
      />
      <input type="hidden" name={name} value={value} disabled={disabled} />
      {calendarOpen && !disabled && (
        <DatePicker
          id={`${id}-calendar`}
          label={label}
          value={value}
          onClose={() => setCalendarOpen(false)}
          onSelect={(date) => {
            emitted.current = date;
            setText(formatDateOnly(date));
            onValueChange(date);
            setCalendarOpen(false);
          }}
        />
      )}
    </>
  );
}
