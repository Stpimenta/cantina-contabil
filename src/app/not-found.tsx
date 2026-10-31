import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="centered-page">
      <div className="stack">
        <h1>Página não encontrada</h1>
        <p className="muted">Confira o endereço ou volte para o início.</p>
        <Link className={buttonClassName()} href="/">
          Voltar para Home
        </Link>
      </div>
    </main>
  );
}
