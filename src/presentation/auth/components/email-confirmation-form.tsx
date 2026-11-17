"use client";
import { useEffect, useRef, useState } from "react";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { confirmAccountEmailAction } from "@/server/auth/actions/account-enrollment.action";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/modals/error-modal";
export function EmailConfirmationForm() {
  const captured = useRef(false),
    [proof, setProof] = useState<{ tokenHash: string; type: string } | null>(
      null,
    );
  const action = useServerAction({
    connectionMessage: "Não foi possível confirmar o link. Tente novamente.",
  });
  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    const url = new URL(location.href),
      hash = new URLSearchParams(url.hash.slice(1));
    const tokenHash =
        hash.get("token_hash") ?? url.searchParams.get("token_hash"),
      type = hash.get("type") ?? url.searchParams.get("type");
    if (tokenHash && (type === "invite" || type === "recovery"))
      setProof({ tokenHash, type });
    history.replaceState(null, "", "/auth/confirm");
  }, []);
  return (
    <div className="stack">
      <p>
        {proof
          ? "Confirme para continuar e definir sua senha."
          : "Abra o link completo recebido por e-mail para continuar."}
      </p>
      <Button
        disabled={!proof}
        busy={action.pending}
        onClick={() => {
          if (proof) action.execute(() => confirmAccountEmailAction(proof));
        }}
      >
        Confirmar e-mail
      </Button>
      <ErrorModal error={action.error} onClose={action.closeError} />
    </div>
  );
}
