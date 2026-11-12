"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { ErrorModal } from "@/components/modals/error-modal";
import type { Result } from "@/shared/errors/application-error";
export function ActivateAccess() {
  const [secret, setSecret] = useState<string | null>(null),
    router = useRouter();
  useEffect(() => {
    setSecret(new URLSearchParams(location.hash.slice(1)).get("chave"));
    history.replaceState(null, "", location.pathname);
  }, []);
  const { execute, pending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a ativação. Tente novamente neste navegador.",
  });
  return (
    <div className="stack">
      <p>
        Este acesso ficará vinculado a este navegador até vencer ou ser
        revogado.
      </p>
      <Button
        disabled={!secret}
        busy={pending}
        onClick={() =>
          execute(
            async () => {
              const r = await fetch("/acesso-comandas/ativar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ secret }),
              });
              return r.json() as Promise<Result<{ eventId: string }>>;
            },
            (v) => router.replace(`/comandas/${v.eventId}`),
          )
        }
      >
        Ativar acesso
      </Button>
      {secret === null && (
        <p className="muted">Abra o link fornecido pelo responsável.</p>
      )}
      <ErrorModal error={error} onClose={closeError} />
    </div>
  );
}
