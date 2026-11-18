"use client";
import { Button } from "./button";
import { Field } from "./field";
import { Icon } from "./icon";
import styles from "./quantity-stepper.module.css";
export function QuantityStepper({
  id,
  label,
  value,
  onValueChange,
  disabled = false,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const number = /^\d+$/.test(value) ? Number(value) : NaN;
  function step(delta: number) {
    if (disabled) return;
    const next = Number.isSafeInteger(number) ? number + delta : 1;
    if (Number.isSafeInteger(next) && next >= 1) onValueChange(String(next));
  }
  return (
    <div className={styles.root}>
      <label id={`${id}-label`} htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.controls}>
        <Button
          type="button"
          variant="neutral"
          iconOnly
          aria-label="Diminuir quantidade"
          disabled={disabled || number <= 1}
          onClick={() => step(-1)}
        >
          <Icon name="minus" />
        </Button>
        <Field
          id={id}
          name="quantity"
          label={label}
          hideLabel
          aria-labelledby={`${id}-label`}
          appearance="quantityStepper"
          type="number"
          inputMode="numeric"
          min={1}
          max={Number.MAX_SAFE_INTEGER}
          step={1}
          value={value}
          required
          disabled={disabled}
          error={error}
          onChange={(e) => {
            if (!e.target.validity.badInput && /^\d*$/.test(e.target.value))
              onValueChange(e.target.value);
          }}
        />
        <Button
          type="button"
          variant="neutral"
          iconOnly
          aria-label="Aumentar quantidade"
          disabled={disabled || number >= Number.MAX_SAFE_INTEGER}
          onClick={() => step(1)}
        >
          <Icon name="plus" />
        </Button>
      </div>
    </div>
  );
}
