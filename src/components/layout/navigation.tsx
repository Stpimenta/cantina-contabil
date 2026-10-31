"use client";

import styles from "./navigation.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../ui/icon";

export function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu principal">
      <Link
        className={styles.link}
        href="/"
        aria-current={pathname === "/" ? "page" : undefined}
        onClick={onNavigate}
      >
        <Icon name="home" />
        Home
      </Link>
      <Link
        className={styles.link}
        href="/caixas"
        aria-current={pathname.startsWith("/caixas") ? "page" : undefined}
        onClick={onNavigate}
      >
        <Icon name="box" />
        Caixas
      </Link>
      <Link
        className={styles.link}
        href="/doacoes"
        aria-current={pathname.startsWith("/doacoes") ? "page" : undefined}
        onClick={onNavigate}
      >
        <Icon name="donation" />
        Doações
      </Link>
      <Link
        className={styles.link}
        href="/eventos"
        aria-current={pathname.startsWith("/eventos") ? "page" : undefined}
        onClick={onNavigate}
      >
        <Icon name="calendar" />
        Eventos
      </Link>
      <Link
        className={styles.link}
        href="/movimentacoes"
        aria-current={
          pathname.startsWith("/movimentacoes") ? "page" : undefined
        }
        onClick={onNavigate}
      >
        <Icon name="movements" />
        Movimentações
      </Link>
    </nav>
  );
}
