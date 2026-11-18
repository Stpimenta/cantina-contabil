import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { AuthPanel } from "@/presentation/auth/components/auth-panel";
import { OwnPasswordForm } from "@/presentation/auth/components/own-password-form";
export const metadata = { title: "Definir senha" };
export default async function PasswordPage() {
  const setup = await createAuth().hasSetup.execute();
  if (!setup) redirect("/login");
  return (
    <AuthPanel
      title="Defina sua senha"
      description="Esta será sua senha própria do Ministério Contábil."
    >
      <OwnPasswordForm requireName={setup.requiresName} />
    </AuthPanel>
  );
}
