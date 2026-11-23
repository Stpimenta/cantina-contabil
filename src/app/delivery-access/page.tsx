import { ActivateAccess } from "@/presentation/canteen/components/activate-access";
import styles from "@/presentation/deliveries/components/deliveries.module.css";
export const metadata = {
  title: "Acesso às entregas",
  referrer: "no-referrer" as const,
};
export default function DeliveryAccessPage() {
  return (
    <main className={`${styles.shell} stack`}>
      <h1>Acesso às entregas</h1>
      <ActivateAccess
        activationPath="/delivery-access/activate"
        destinationPath="/deliveries"
      />
    </main>
  );
}
