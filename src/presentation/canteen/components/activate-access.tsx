"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { ErrorModal } from "@/components/modals/error-modal";
import type { Result } from "@/shared/errors/application-error";
export function ActivateAccess({
  activationPath = "/command-access/activate",
  destinationPath = "/commands",
}: {
  activationPath?: string;
  destinationPath?: string;
}) {
  const [secret, setSecret] = useState<string | null>(null),
    router = useRouter();
  const captured = useRef(false);
  useEffect(() => {
    // Development may replay effect setup after the URL was already cleaned.
    if (captured.current) return;
    captured.current = true;
    setSecret(new URLSearchParams(location.hash.slice(1)).get("chave"));
    history.replaceState(history.state, "", location.pathname);
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
              const r = await fetch(activationPath, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ secret }),
              });
              return r.json() as Promise<Result<{ eventId: string }>>;
            },
            (v) => router.replace(`${destinationPath}/${v.eventId}`),
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
