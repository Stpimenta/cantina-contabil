import Link from "next/link";
import { buttonClassName } from "../ui/button";
import { Icon } from "../ui/icon";
import styles from "./breadcrumbs.module.css";

export function Breadcrumbs({
  items,
  loading = false,
}: {
  items: { label: string; href?: string }[];
  loading?: boolean;
}) {
  const parent = items
    .slice(0, -1)
    .reverse()
    .find((item) => item.href);
  const backClassName = buttonClassName({
    variant: "ghost",
    className: styles.back,
  });
  return (
    <div className={styles.root}>
      <nav className={styles.trail} aria-label="Caminho de navegação">
        <ol className={styles.list}>
          {items.map((item, index) => (
            <li key={`${index}-${item.label}`} className={styles.item}>
              {index > 0 && (
                <span aria-hidden="true" className="muted">
                  /
                </span>
              )}
              {item.href ? (
                <Link className="text-link" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={index === items.length - 1 ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {parent &&
        (loading ? (
          <span role="link" aria-disabled="true" className={backClassName}>
            <Icon name="chevronLeft" />
            Voltar
          </span>
        ) : (
          <Link
            href={parent.href!}
            className={backClassName}
            aria-label={`Voltar para ${parent.label}`}
          >
            <Icon name="chevronLeft" />
            Voltar
          </Link>
        ))}
    </div>
  );
}
