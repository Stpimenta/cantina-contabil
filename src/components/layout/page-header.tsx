import styles from "./page-header.module.css";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "../ui/icon";
export function PageHeader({
  title,
  icon,
  description,
  hideDescriptionOnMobile = false,
  actions,
  compactActionsOnMobile = false,
}: {
  title: string;
  icon?: ComponentProps<typeof Icon>["name"];
  description?: string;
  hideDescriptionOnMobile?: boolean;
  actions?: ReactNode;
  compactActionsOnMobile?: boolean;
}) {
  return (
    <div
      className={`spread-row ${styles.root}${compactActionsOnMobile ? ` ${styles.compact}` : ""}`}
    >
      <div className={`stack-small ${styles.identity}`}>
        <div className={styles.title}>
          {icon && (
            <span className={styles.icon}>
              <Icon name={icon} />
            </span>
          )}
          <h1>{title}</h1>
        </div>
        {description && (
          <p
            className={`muted${hideDescriptionOnMobile ? ` ${styles.desktopDescription}` : ""}`}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="action-group">{actions}</div>}
    </div>
  );
}
