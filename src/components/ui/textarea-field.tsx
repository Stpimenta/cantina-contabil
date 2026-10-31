import { FieldError } from "./field-error";
import styles from "./field.module.css";
import type { TextareaHTMLAttributes } from "react";

export function TextareaField({
  id,
  label,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  error?: string;
}) {
  return (
    <div className={styles.root}>
      <label htmlFor={id}>{label}</label>
      <textarea
        {...props}
        className="resize-none"
        id={id}
        rows={4}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}
