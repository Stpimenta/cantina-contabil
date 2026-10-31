"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { DayPicker, type DayButtonProps } from "@daypicker/react";
import { ptBR } from "@daypicker/react/locale";
import { Modal } from "../modals/modal";
import { Button } from "./button";
import { currentDateInSaoPaulo } from "@/shared/formatting/date-time";
import { isDateOnly } from "@/shared/dates/date-only";
import styles from "./date-picker.module.css";

function calendarDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function CalendarDay({ day, modifiers, ...props }: DayButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  return (
    <Button
      {...props}
      ref={ref}
      type="button"
      iconOnly
      variant={modifiers.selected ? "primary" : "ghost"}
    />
  );
}

function CalendarNavigation(props: ComponentProps<"button">) {
  return <Button {...props} type="button" variant="ghost" iconOnly />;
}

export function DatePicker({
  id,
  label,
  value,
  onSelect,
  onClose,
}: {
  id: string;
  label: string;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const today = currentDateInSaoPaulo();
  return (
    <Modal id={id} open title={`Selecionar data — ${label}`} onClose={onClose}>
      <div className={styles.viewport}>
        <DayPicker
          locale={ptBR}
          mode="single"
          required
          autoFocus
          selected={isDateOnly(value) ? calendarDate(value) : undefined}
          defaultMonth={calendarDate(isDateOnly(value) ? value : today)}
          today={calendarDate(today)}
          startMonth={calendarDate("0001-01-01")}
          endMonth={calendarDate("9999-12-01")}
          navLayout="around"
          fixedWeeks
          onSelect={(date) => {
            const selected = `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            onSelect(selected);
          }}
          components={{
            DayButton: CalendarDay,
            PreviousMonthButton: CalendarNavigation,
            NextMonthButton: CalendarNavigation,
          }}
          classNames={{
            root: styles.calendar,
            month: styles.month,
            month_caption: styles.caption,
            caption_label: styles.captionLabel,
            month_grid: styles.grid,
            weekday: styles.weekday,
            day: styles.day,
            today: styles.today,
            chevron: styles.chevron,
          }}
        />
      </div>
      <div className="centered-actions">
        <Button type="button" variant="neutral" onClick={() => onSelect(today)}>
          Hoje
        </Button>
      </div>
    </Modal>
  );
}
