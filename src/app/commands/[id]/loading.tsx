import { CommandLoading } from "@/presentation/canteen/components/command-loading";
import styles from "@/presentation/canteen/components/command-board.module.css";
export default function Loading() {
  return (
    <main className={styles.shell}>
      <CommandLoading restricted />
    </main>
  );
}
