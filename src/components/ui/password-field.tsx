"use client";
import { useState } from "react";
import { Field } from "./field";
import { Button } from "./button";
import { Icon } from "./icon";
import styles from "./field.module.css";
export function PasswordField({
  id,
  label,
  name,
  error,
  disabled,
  autoComplete = "new-password",
}: {
  id: string;
  label: string;
  name: string;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      id={id}
      label={label}
      name={name}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      required
      maxLength={1024}
      error={error}
      disabled={disabled}
      trailing={
        <Button
          type="button"
          variant="ghost"
          iconOnly
          className={styles.trailing}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
          disabled={disabled}
        >
          <Icon name={visible ? "eyeOff" : "eye"} />
        </Button>
      }
    />
  );
}
