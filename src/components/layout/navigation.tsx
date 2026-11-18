"use client";

import { useCashBoxAccess } from "../ui/cash-box-access";
import styles from "./navigation.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../ui/icon";

export function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { isAdmin, isOperator } = useCashBoxAccess();
  return (
    <nav aria-label="Menu principal">
      {!isOperator && (
        <Link
          className={styles.link}
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon name="home" />
          Home
        </Link>
      )}
      {!isOperator && (
        <Link
          className={styles.link}
          href="/cash-boxes"
          aria-current={pathname.startsWith("/cash-boxes") ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon name="box" />
          Caixas
        </Link>
      )}
      {!isOperator && (
        <Link
          className={styles.link}
          href="/donations"
          aria-current={pathname.startsWith("/donations") ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon name="donation" />
          Doações
        </Link>
      )}
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
        href="/products"
        aria-current={pathname.startsWith("/products") ? "page" : undefined}
        onClick={onNavigate}
      >
        <Icon name="box" />
        Produtos
      </Link>
      {!isOperator && (
        <Link
          className={styles.link}
          href="/movements"
          aria-current={pathname.startsWith("/movements") ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon name="movements" />
          Movimentações
        </Link>
      )}
      {isAdmin && (
        <Link
          className={styles.link}
          href="/users"
          aria-current={pathname.startsWith("/users") ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon name="user" />
          Usuários
        </Link>
      )}
    </nav>
  );
}
