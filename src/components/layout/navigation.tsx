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
        href="/cash-boxes"
        aria-current={pathname.startsWith("/cash-boxes") ? "page" : undefined}
        onClick={onNavigate}
      >
        <Icon name="box" />
        Caixas
      </Link>
      <Link
        className={styles.link}
        href="/donations"
        aria-current={pathname.startsWith("/donations") ? "page" : undefined}
        onClick={onNavigate}
      >
        <Icon name="donation" />
        Doações
      </Link>
      <Link
        className={styles.link}
        href="/events"
        aria-current={pathname.startsWith("/events") ? "page" : undefined}
        onClick={onNavigate}
      >
        <Icon name="calendar" />
        Eventos
      </Link>
      <Link
        className={styles.link}
        href="/movements"
        aria-current={pathname.startsWith("/movements") ? "page" : undefined}
        onClick={onNavigate}
      >
        <Icon name="movements" />
        Movimentações
      </Link>
    </nav>
  );
}
