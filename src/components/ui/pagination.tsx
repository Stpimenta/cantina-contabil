"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { buttonClassName } from "./button";
import styles from "./pagination.module.css";
export function Pagination({
  basePath,
  page,
  pageSize,
  total,
  query = "",
  pageKey = "page",
  scroll = true,
  filters = {},
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  query?: string;
  pageKey?: string;
  scroll?: boolean;
  filters?: Record<string, string>;
}) {
  const previousPage = useRef(page);
  useEffect(() => {
    const changed = previousPage.current !== page;
    previousPage.current = page;
    if (changed && scroll && matchMedia("(max-width: 47.999rem)").matches) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [page, scroll]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (next: number) => {
    const params = new URLSearchParams(filters);
    if (query) params.set("q", query);
    if (next > 1) params.set(pageKey, String(next));
    return `${basePath}${params.size ? `?${params}` : ""}`;
  };
  return (
    <nav className={`spread-row ${styles.root}`} aria-label="Paginação">
      <p className="muted">
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`
          : "0 resultados"}
      </p>
      {pages > 1 && (
        <div className="action-group">
          {page > 1 ? (
            <Link
              className={buttonClassName({ variant: "neutral" })}
              href={href(page - 1)}
              scroll={scroll}
            >
              Anterior
            </Link>
          ) : (
            <span
              className={buttonClassName({ variant: "neutral" })}
              aria-disabled="true"
            >
              Anterior
            </span>
          )}
          <span>
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link
              className={buttonClassName({ variant: "neutral" })}
              href={href(page + 1)}
              scroll={scroll}
            >
              Próxima
            </Link>
          ) : (
            <span
              className={buttonClassName({ variant: "neutral" })}
              aria-disabled="true"
            >
              Próxima
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
