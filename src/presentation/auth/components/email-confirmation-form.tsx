"use client";
import { useEffect, useRef, useState } from "react";
import { readEmailProof } from "@/presentation/auth/models/read-email-proof";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { confirmAccountEmailAction } from "@/server/auth/actions/account-enrollment.action";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/modals/error-modal";
export function EmailConfirmationForm() {
  const captured = useRef<ReturnType<typeof readEmailProof>>(null);
  const [proof, setProof] = useState<ReturnType<typeof readEmailProof>>(null);
  const [ready, setReady] = useState(false);
  const action = useServerAction({
    connectionMessage: "Não foi possível confirmar o link. Tente novamente.",
  });
  useEffect(() => {
    function capture() {
      const next = readEmailProof(location.href);
      if (next) {
        captured.current = next;
        setProof(next);
      } else if (location.hash || location.search) {
        captured.current = null;
        setProof(null);
      }
      // Preserve Next's navigation state and keep proof only in component memory.
      if (location.hash || location.search)
        history.replaceState(history.state, "", "/auth/confirm");
      setReady(true);
    }
    capture();
    window.addEventListener("hashchange", capture);
    window.addEventListener("popstate", capture);
    return () => {
      window.removeEventListener("hashchange", capture);
      window.removeEventListener("popstate", capture);
    };
  }, []);
  return (
    <div className="stack">
      <p role="status" aria-live="polite">
        {!ready
          ? "Carregando o link de confirmação…"
          : proof
            ? "Confirme para continuar e definir sua senha."
            : "Link incompleto ou inválido. Abra o link completo recebido por e-mail."}
      </p>
      <noscript>
        <p>Ative o JavaScript do navegador para confirmar seu e-mail.</p>
      </noscript>
      <Button
        disabled={!ready || !proof}
        busy={action.pending}
        onClick={() => {
          const current =
            location.hash || location.search
              ? readEmailProof(location.href)
              : captured.current;
          if (current) action.execute(() => confirmAccountEmailAction(current));
        }}
      >
        Confirmar e-mail
      </Button>
      <ErrorModal error={action.error} onClose={action.closeError} />
    </div>
  );
}
