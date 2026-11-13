import styles from "@/presentation/canteen/components/command-board.module.css";
import { ActivateAccess } from "@/presentation/canteen/components/activate-access";
export const metadata = {
  title: "Acesso temporário às comandas",
  referrer: "no-referrer" as const,
};
export default function AccessPage() {
  return (
    <main className={`${styles.shell} stack`}>
      <h1>Acesso temporário às comandas</h1>
      <ActivateAccess />
    </main>
  );
}
