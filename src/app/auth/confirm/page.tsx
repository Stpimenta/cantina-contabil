import { AuthPanel } from "@/presentation/auth/components/auth-panel";
import { EmailConfirmationForm } from "@/presentation/auth/components/email-confirmation-form";
export const metadata = { title: "Confirmar e-mail", referrer: "no-referrer" };
export default function ConfirmPage() {
  return (
    <AuthPanel
      title="Confirme seu e-mail"
      description="Este link é pessoal e só pode ser utilizado uma vez."
    >
      <EmailConfirmationForm />
    </AuthPanel>
  );
}
