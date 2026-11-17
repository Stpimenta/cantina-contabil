import type { ReactNode } from "react";
import { Brand } from "@/components/layout/brand";
import styles from "./auth-panel.module.css";
export function AuthPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="centered-page">
      <section className={styles.panel} aria-labelledby="auth-title">
        <Brand variant="login" />
        <div className="stack-small">
          <h1 id="auth-title">{title}</h1>
          <p className="muted">{description}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
