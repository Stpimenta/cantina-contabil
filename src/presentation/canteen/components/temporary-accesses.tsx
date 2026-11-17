"use client";
import { createRequestId } from "@/shared/identifiers/request-id";
import { useId, useRef, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
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
import { Icon } from "@/components/ui/icon";
import styles from "./temporary-accesses.module.css";
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
  const [managing, setManaging] = useState(false),
    [open, setOpen] = useState(false),
    [revoking, setRevoking] = useState<TemporaryAccess | null>(null),
    router = useRouter();
  const { execute, pending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a revogação. Confira os acessos antes de repetir.",
  });
  const [initial, setInitial] = useState(suggested),
    [discard, setDiscard] = useState(false);
  const id = useId(),
    [requestId, setRequestId] = useState(() => createRequestId()),
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
  const {
    execute: create,
    pending: creating,
    error: createError,
    fields,
    closeError: closeCreateError,
    showError,
  } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a criação. Confira os acessos antes de repetir.",
    fieldIds: {
      name: `${id}-name`,
      expiresAt: date && !time ? `${id}-time` : `${id}-date`,
    },
    validationKey: JSON.stringify({ open, name, date, time }),
    validate: () => {
      if (!open) return null;
      const r = validateTemporaryAccess(input);
      return r.ok ? null : presentBusinessFailure(r.error);
    },
  });
  const dirty =
    !link && (name !== "" || date !== initial.date || time !== initial.time);
  useUnsavedChanges(open && dirty);
  const closeTarget = useRef<"form" | "manager">("form");
  const triggerRef = useRef<HTMLButtonElement>(null);
  function finishClose() {
    setOpen(false);
    setName("");
    setLink("");
    setShow(false);
    setCopied(false);
    setDiscard(false);
    if (closeTarget.current === "manager") setManaging(false);
    else triggerRef.current?.focus();
  }
  function close(target: "form" | "manager") {
    closeTarget.current = target;
    if (creating) return;
    if (open && dirty) setDiscard(true);
    else finishClose();
  }
  function closeResult() {
    setLink("");
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    create(
      () => createAccessAction(eventId, input),
      (v) => {
        setOpen(false);
        setName("");
        setShow(false);
        setCopied(false);
        setLink(`${location.origin}/command-access#chave=${v.secret}`);
        router.refresh();
      },
    );
  }
  return (
    <>
      <Button variant="neutral" onClick={() => setManaging(true)}>
        Gerenciar acessos
      </Button>
      {managing && (
        <Modal
          open
          title="Gerenciar acessos"
          size="wide"
          onClose={() => {
            if (!pending) close("manager");
          }}
          footer={
            <Button
              variant="danger"
              disabled={pending || creating}
              onClick={() => close("manager")}
            >
              Fechar
            </Button>
          }
        >
          <div className="stack">
            <div>
              <div className={styles.heading}>
                <h3>Acessos temporários</h3>
                <Button
                  variant="neutral"
                  ref={triggerRef}
                  mobileIcon={<Icon name={open ? "minus" : "plus"} />}
                  aria-label={open ? "Recolher criação" : "Criar acesso"}
                  title={open ? "Recolher criação" : "Criar acesso"}
                  aria-expanded={open}
                  aria-controls={`${id}-creation`}
                  disabled={creating || pending}
                  onClick={() => {
                    if (open) close("form");
                    else {
                      const next = suggested();
                      setInitial(next);
                      setRequestId(createRequestId());
                      setDate(next.date);
                      setTime(next.time);
                      setOpen(true);
                    }
                  }}
                >
                  <span
                    className={`${styles.arrow}${open ? ` ${styles.expanded}` : ""}`}
                  >
                    <Icon name="chevronDown" />
                  </span>
                  <span>{open ? "Recolher criação" : "Criar acesso"}</span>
                </Button>
              </div>
              <section
                id={`${id}-creation`}
                className={`${styles.disclosure}${open ? ` ${styles.open}` : ""}`}
                aria-label="Criar acesso"
                aria-hidden={!open}
                inert={!open}
              >
                <div className={styles.clip}>
                  <div className={`stack ${styles.formContent}`}>
                    <form
                      className="form-grid"
                      id={id}
                      noValidate
                      onSubmit={submit}
                    >
                      <div className="form-full">
                        <Field
                          id={`${id}-name`}
                          label="Nome do acesso"
                          placeholder="Ex.: Caixa 2"
                          value={name}
                          maxLength={100}
                          required
                          disabled={creating}
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
                        disabled={creating}
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
                        disabled={creating}
                        onChange={(e) => setTime(e.target.value)}
                      />
                    </form>
                    <div className="action-group">
                      <Button type="submit" form={id} busy={creating}>
                        Criar acesso
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
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
                        ·{" "}
                        {formatDateTime(
                          new Date(a.expiresAt * 1000).toISOString(),
                        )}
                      </p>
                    </div>
                    {!a.revokedAt && a.expiresAt * 1000 > Date.now() && (
                      <Button
                        variant="danger"
                        disabled={pending || creating}
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
          </div>
        </Modal>
      )}
      {link && (
        <Modal
          open
          title="Acesso criado"
          onClose={closeResult}
          footer={
            <Button variant="danger" onClick={closeResult}>
              Fechar
            </Button>
          }
        >
          <div className="stack">
            <p>
              Copie e guarde este link: ele aparece só agora e funciona apenas
              no primeiro navegador que o ativar.
            </p>
            <div className={styles.qrCode}>
              <QRCodeSVG
                value={link}
                size={256}
                marginSize={4}
                title="QR code do acesso temporário"
              />
            </div>
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
            <span className="sr-only" role="status">
              {copied ? "Link copiado." : ""}
            </span>
          </div>
        </Modal>
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
                revokeAccessAction(eventId, revoking.id, createRequestId()),
              () => {
                setRevoking(null);
                router.refresh();
              },
            )
          }
          busy={pending}
        />
      )}
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="As alterações ainda não foram salvas."
          confirmLabel="Descartar"
          onCancel={() => setDiscard(false)}
          onConfirm={finishClose}
        />
      )}
      <ErrorModal error={createError} onClose={closeCreateError} />
      <ErrorModal error={error} onClose={closeError} />
    </>
  );
}
