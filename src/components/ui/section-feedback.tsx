import type { ReactNode } from "react";
import { SectionIllustration, type SectionArea } from "./section-illustration";
import styles from "./section-feedback.module.css";

export function SectionFeedback({
  area,
  children,
}: {
  area: SectionArea;
  children: ReactNode;
}) {
  return (
    <div className={styles.root}>
      <SectionIllustration area={area} />
      <p>{children}</p>
    </div>
  );
}
