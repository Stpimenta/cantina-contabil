import { AuthPanel } from "@/presentation/auth/components/auth-panel";
import { RecoveryForm } from "@/presentation/auth/components/recovery-form";
export const metadata = { title: "Recuperar senha" };
export default function RecoverPage() {
  return (
    <AuthPanel
      title="Recuperar senha"
      description="Informe o e-mail da sua conta do Ministério Contábil."
    >
      <RecoveryForm />
    </AuthPanel>
  );
}
