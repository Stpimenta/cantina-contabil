import type { ComponentPropsWithRef, ReactNode } from "react";
import styles from "./button.module.css";

type ButtonStyle = {
  variant?: "primary" | "neutral" | "ghost" | "danger";
  size?: "standard" | "large";
  compactOnMobile?: boolean;
  iconOnly?: boolean;
  shape?: "standard" | "search";
  className?: string;
};

// Mesma aparência para ações e links que funcionam como botões.
export function buttonClassName({
  variant = "primary",
  size = "standard",
  compactOnMobile = false,
  iconOnly = false,
  shape = "standard",
  className = "",
}: ButtonStyle = {}) {
  return [
    styles.root,
    styles[variant],
    size === "large" && styles.large,
    compactOnMobile && styles.compactOnMobile,
    iconOnly && styles.iconOnly,
    shape === "search" && styles.search,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant,
  busy = false,
  size,
  iconOnly,
  compactOnMobile,
  shape,
  className,
  children,
  mobileIcon,
  iconBreakpoint = "mobile",
  disabled,
  ...props
}: ComponentPropsWithRef<"button"> &
  ButtonStyle & {
    busy?: boolean;
    mobileIcon?: ReactNode;
    iconBreakpoint?: "mobile" | "tablet";
  }) {
  return (
    <button
      {...props}
      className={buttonClassName({
        variant,
        size,
        iconOnly,
        compactOnMobile,
        shape,
        className: `${className ?? ""}${mobileIcon ? ` ${iconBreakpoint === "tablet" ? styles.tabletCompact : styles.mobileCompact}` : ""}`,
      })}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {mobileIcon ? (
        <>
          <span className={styles.mobileIcon}>{mobileIcon}</span>
          <span className={styles.desktopContent}>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
