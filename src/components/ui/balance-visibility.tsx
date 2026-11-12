"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { formatCurrency } from "@/shared/formatting/currency";
import { Button } from "./button";
import { Icon } from "./icon";

const BalanceVisibility = createContext({ visible: false, toggle: () => {} });

export function BalanceVisibilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <BalanceVisibility.Provider
      value={{ visible, toggle: () => setVisible((value) => !value) }}
    >
      {children}
      <span className="sr-only" role="status">
        {visible ? "Valores visíveis" : "Valores ocultos"}
      </span>
    </BalanceVisibility.Provider>
  );
}

export function BalanceVisibilityToggle({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { visible, toggle } = useContext(BalanceVisibility);
  const label = visible ? "Ocultar valores" : "Mostrar valores";
  return (
    <Button
      type="button"
      disabled={disabled}
      variant="ghost"
      iconOnly
      aria-label={label}
      title={label}
      aria-pressed={visible}
      onClick={toggle}
    >
      <Icon name={visible ? "eyeOff" : "eye"} />
    </Button>
  );
}

export function BalanceAmount({ cents }: { cents: number }) {
  const { visible } = useContext(BalanceVisibility);
  return visible ? (
    formatCurrency(cents)
  ) : (
    <span role="img" aria-label="Valor oculto">
      ••••
    </span>
  );
}
