import Link from "next/link";
import styles from "./breadcrumbs.module.css";

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Caminho de navegação">
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
  );
}
