"use client";
import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { TemporaryAccess } from "@/server/canteen/models/temporary-access.model";
import { validateTemporaryAccess } from "@/server/canteen/inputs/command.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { createAccessAction } from "@/server/canteen/actions/create-access.action";
import { revokeAccessAction } from "@/server/canteen/actions/revoke-access.action";
import { Modal } from "@/components/modals/modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { DateField } from "@/components/ui/date-field";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { formatDateTime } from "@/shared/formatting/date-time";
function suggested() {
  const date = new Date(Date.now() + 7200000);
  return {
    date: new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date),
    time: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  };
}
export function TemporaryAccesses({
  eventId,
  accesses,
}: {
  eventId: string;
  accesses: TemporaryAccess[];
}) {
  const [open, setOpen] = useState(false),
    [revoking, setRevoking] = useState<TemporaryAccess | null>(null),
    router = useRouter();
  const { execute, pending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a revogação. Confira os acessos antes de repetir.",
  });
  return (
    <section className="stack">
      <div className="spread-row">
        <h2>Acessos temporários</h2>
        <Button variant="neutral" onClick={() => setOpen(true)}>
          Criar acesso
        </Button>
      </div>
      {accesses.length ? (
        <ul className="record-list">
          {accesses.map((a) => (
            <li key={a.id} className="record-row">
              <div>
                <p>{a.name}</p>
                <p className="muted record-meta">
                  {a.revokedAt
                    ? "Revogado"
                    : a.expiresAt * 1000 <= Date.now()
                      ? "Encerrado"
                      : a.activatedAt
                        ? "Ativado"
                        : "Aguardando ativação"}{" "}
                  · {formatDateTime(new Date(a.expiresAt * 1000).toISOString())}
                </p>
              </div>
              {!a.revokedAt && a.expiresAt * 1000 > Date.now() && (
                <Button
                  variant="danger"
                  disabled={pending}
                  onClick={() => setRevoking(a)}
                >
                  Revogar
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nenhum acesso temporário criado.</p>
      )}
      {open && (
        <CreateAccessModal
          eventId={eventId}
          onClose={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
      {revoking && (
        <ConfirmationModal
          title="Revogar acesso?"
          message={`O acesso ${revoking.name} será encerrado neste navegador.`}
          confirmLabel="Revogar"
          onCancel={() => setRevoking(null)}
          onConfirm={() =>
            execute(
              () =>
                revokeAccessAction(eventId, revoking.id, crypto.randomUUID()),
              () => {
                setRevoking(null);
                router.refresh();
              },
            )
          }
          busy={pending}
        />
      )}
      <ErrorModal error={error} onClose={closeError} />
    </section>
  );
}
function CreateAccessModal({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const [initial] = useState(suggested),
    [discard, setDiscard] = useState(false);
  const id = useId(),
    [requestId] = useState(() => crypto.randomUUID()),
    [name, setName] = useState(""),
    [date, setDate] = useState(initial.date),
    [time, setTime] = useState(initial.time),
    [link, setLink] = useState(""),
    [show, setShow] = useState(false),
    [copied, setCopied] = useState(false);
  const input = {
    requestId,
    name,
    expiresAt: Math.floor(
      new Date(`${date}T${time}:00-03:00`).getTime() / 1000,
    ),
  };
  const { execute, pending, error, fields, closeError, showError } =
    useServerAction({
      connectionMessage:
        "Não foi possível confirmar a criação. Confira os acessos antes de repetir.",
      fieldIds: {
        name: `${id}-name`,
        expiresAt: date && !time ? `${id}-time` : `${id}-date`,
      },
      validationKey: JSON.stringify({ name, date, time }),
      validate: () => {
        const r = validateTemporaryAccess(input);
        return r.ok ? null : presentBusinessFailure(r.error);
      },
    });
  const dirty =
    !link && (name !== "" || date !== initial.date || time !== initial.time);
  useUnsavedChanges(dirty);
  function close() {
    if (pending) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    execute(
      () => createAccessAction(eventId, input),
      (v) => setLink(`${location.origin}/command-access#chave=${v.secret}`),
    );
  }
  return (
    <>
      <Modal
        open
        title="Acesso temporário às comandas"
        size="form"
        onClose={close}
        footer={
          <>
            <Button variant="neutral" disabled={pending} onClick={close}>
              Fechar
            </Button>
            {!link && (
              <Button type="submit" form={id} busy={pending}>
                Criar acesso
              </Button>
            )}
          </>
        }
      >
        {link ? (
          <div className="stack">
            <p>
              Quem possuir este link poderá ativá-lo primeiro. Ele funciona
              somente no navegador que o ativar.
            </p>
            <Field
              id={`${id}-link`}
              label="Link temporário"
              type={show ? "text" : "password"}
              value={link}
              readOnly
              autoComplete="off"
            />
            <div className="action-group">
              <Button
                variant="neutral"
                aria-pressed={show}
                onClick={() => setShow(!show)}
              >
                {show ? "Ocultar link" : "Mostrar link"}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                  } catch {
                    showError({
                      code: "CLIPBOARD_FAILED",
                      category: "unexpected",
                      message:
                        "Não foi possível copiar. Mostre o link e copie manualmente.",
                    });
                  }
                }}
              >
                Copiar link
              </Button>
            </div>
            <p role="status">
              {copied
                ? "Link copiado."
                : "Guarde o link agora. Ele não será exibido novamente."}
            </p>
          </div>
        ) : (
          <form className="form-grid" id={id} noValidate onSubmit={submit}>
            <div className="form-full">
              <Field
                id={`${id}-name`}
                label="Nome do acesso"
                placeholder="Ex.: Caixa 2"
                value={name}
                maxLength={100}
                required
                disabled={pending}
                error={fields?.name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <DateField
              name="expiresOn"
              id={`${id}-date`}
              label="Data de vencimento"
              value={date}
              onValueChange={setDate}
              disabled={pending}
              error={fields?.expiresAt}
            />
            <Field
              id={`${id}-time`}
              aria-invalid={!!fields?.expiresAt}
              aria-describedby={
                fields?.expiresAt ? `${id}-date-error` : undefined
              }
              type="time"
              label="Horário de vencimento (Brasília)"
              value={time}
              required
              disabled={pending}
              onChange={(e) => setTime(e.target.value)}
            />
          </form>
        )}
      </Modal>
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="As alterações ainda não foram salvas."
          confirmLabel="Descartar"
          onCancel={() => setDiscard(false)}
          onConfirm={onClose}
        />
      )}
      <ErrorModal error={error} onClose={closeError} />
    </>
  );
}
