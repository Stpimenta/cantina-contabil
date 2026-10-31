"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./page-transition.module.css";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className={styles.root}>
      {children}
    </div>
  );
}
