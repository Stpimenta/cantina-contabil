import styles from "./page.module.css";
import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { LoginForm } from "@/presentation/auth/components/login-form";
import { Brand } from "@/components/layout/brand";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  if ("gmail" in query || "senha" in query) redirect("/login");
  if (await createAuth().getSession.execute()) redirect("/");
  return (
    <main className="centered-page">
      <section className={styles.panel} aria-labelledby="login-title">
        <Brand variant="login" />
        <div className="stack-small">
          <h1 id="login-title">Entre na sua conta</h1>
          <p className="muted">Use seu e-mail e senha da Palavra Viva.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
