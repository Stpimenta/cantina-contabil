"use client";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import type { DeliveryAccess } from "@/server/deliveries/models/delivery-access.model";
import { validateDeliveryAccess } from "@/server/deliveries/inputs/delivery.input";
import { createDeliveryAccessAction } from "@/server/deliveries/actions/create-delivery-access.action";
import { revokeDeliveryAccessAction } from "@/server/deliveries/actions/revoke-delivery-access.action";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { createRequestId } from "@/shared/identifiers/request-id";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { formatDateTime } from "@/shared/formatting/date-time";
import { Modal } from "@/components/modals/modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { DateField } from "@/components/ui/date-field";
import { SelectField } from "@/components/ui/select-field";
import { CopyButton } from "@/components/ui/copy-button";
import styles from "./deliveries.module.css";
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
export function DeliveryAccesses({
  eventId,
  drivers,
  accesses,
}: {
  eventId: string;
  drivers: { id: string; name: string }[];
  accesses: DeliveryAccess[];
}) {
  const createTrigger = useRef<HTMLButtonElement>(null);
  const id = useId(),
    router = useRouter(),
    [managing, setManaging] = useState(false),
    [creating, setCreating] = useState(false),
    [driverId, setDriverId] = useState(""),
    [initial, setInitial] = useState(suggested),
    [date, setDate] = useState(initial.date),
    [time, setTime] = useState(initial.time),
    [requestId, setRequestId] = useState(createRequestId),
    [link, setLink] = useState(""),
    [discard, setDiscard] = useState(false),
    [revoking, setRevoking] = useState<DeliveryAccess | null>(null);
  const input = {
    requestId,
    driverId,
    name: drivers.find((d) => d.id === driverId)?.name ?? "",
    expiresAt: Math.floor(
      new Date(`${date}T${time}:00-03:00`).getTime() / 1000,
    ),
  };
  const create = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a criação. Confira os acessos antes de repetir.",
    fieldIds: { driverId: `${id}-driver`, expiresAt: `${id}-date` },
    validationKey: JSON.stringify(input),
    validate: () => {
      const r = validateDeliveryAccess(input);
      return r.ok ? null : presentBusinessFailure(r.error);
    },
  });
  const revoke = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a revogação. Confira os acessos antes de repetir.",
  });
  const dirty =
      creating &&
      (!!driverId || date !== initial.date || time !== initial.time),
    busy = create.pending || revoke.pending;
  useUnsavedChanges(dirty);
  function close() {
    if (create.isPending() || revoke.isPending()) return;
    if (dirty) setDiscard(true);
    else {
      setCreating(false);
      setManaging(false);
    }
  }
  function closeResult() {
    setLink("");
    requestAnimationFrame(() => createTrigger.current?.focus());
  }
  function reset() {
    const value = suggested();
    setInitial(value);
    setDate(value.date);
    setTime(value.time);
    setDriverId("");
    setRequestId(createRequestId());
    create.resetValidation();
    setCreating(true);
  }
  return (
    <>
      <Button variant="neutral" onClick={() => setManaging(true)}>
        Gerenciar acessos
      </Button>
      {managing && (
        <Modal
          open
          title="Acessos dos entregadores"
          size="wide"
          onClose={close}
          footer={
            <Button variant="danger" disabled={busy} onClick={close}>
              Fechar
            </Button>
          }
        >
          <div className="stack">
            <div>
              <Button
                variant="neutral"
                disabled={busy || creating || !drivers.length}
                ref={createTrigger}
                onClick={reset}
              >
                Criar acesso
              </Button>
            </div>
            {creating && (
              <form
                className="stack-small"
                onSubmit={(e) => {
                  e.preventDefault();
                  create.execute(
                    () => createDeliveryAccessAction(eventId, input),
                    (v) => {
                      setCreating(false);
                      setDriverId("");
                      setLink(
                        `${location.origin}/delivery-access#chave=${v.secret}`,
                      );
                      router.refresh();
                    },
                  );
                }}
              >
                <SelectField
                  id={`${id}-driver`}
                  label="Entregador do evento"
                  value={driverId}
                  onValueChange={setDriverId}
                  disabled={busy}
                  error={create.fields?.driverId}
                  options={[
                    { value: "", label: "Selecione" },
                    ...drivers.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
                <div className="form-grid">
                  <DateField
                    id={`${id}-date`}
                    label="Vencimento"
                    name="expiresOn"
                    value={date}
                    onValueChange={setDate}
                    disabled={busy}
                    error={create.fields?.expiresAt}
                  />
                  <Field
                    id={`${id}-time`}
                    type="time"
                    label="Horário de Brasília"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className={styles.controls}>
                  <Button type="submit" busy={create.pending}>
                    Criar link
                  </Button>
                </div>
              </form>
            )}
            <ul className="record-list">
              {accesses.map((a) => (
                <li key={a.id} className="record-row">
                  <div className="stack-small">
                    <p className="record-title">{a.name}</p>
                    <p className="muted">
                      {formatDateTime(
                        new Date(a.expiresAt * 1000).toISOString(),
                      )}{" "}
                      ·{" "}
                      {a.revokedAt
                        ? "Revogado"
                        : a.expiresAt <= Math.floor(Date.now() / 1000)
                          ? "Expirado"
                          : a.activatedAt
                            ? "Ativo"
                            : "Não ativado"}
                    </p>
                  </div>
                  {!a.revokedAt &&
                    a.expiresAt > Math.floor(Date.now() / 1000) && (
                      <Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => setRevoking(a)}
                      >
                        Revogar
                      </Button>
                    )}
                </li>
              ))}
            </ul>
            {!accesses.length && <p>Nenhum acesso criado.</p>}
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
              A primeira pessoa com este link poderá ativá-lo. O acesso ficará
              vinculado ao navegador até vencer ou ser revogado.
            </p>
            <div className={styles.qr}>
              <QRCodeSVG value={link} size={192} />
            </div>
            <Field
              id={`${id}-link`}
              label="Link de acesso"
              readOnly
              value={link}
            />
            <CopyButton text={link} />
          </div>
        </Modal>
      )}
      <ErrorModal error={create.error} onClose={create.closeError} />
      <ErrorModal error={revoke.error} onClose={revoke.closeError} />
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="Os dados do acesso ainda não foram salvos."
          confirmLabel="Descartar"
          onCancel={() => setDiscard(false)}
          onConfirm={() => {
            setCreating(false);
            setManaging(false);
            setDiscard(false);
          }}
        />
      )}
      {revoking && (
        <ConfirmationModal
          title="Revogar acesso?"
          message="O entregador deixará de acessar suas rotas por este link."
          confirmLabel="Revogar"
          busy={revoke.pending}
          onCancel={() => setRevoking(null)}
          onConfirm={() =>
            revoke.execute(
              () => revokeDeliveryAccessAction(eventId, revoking.id),
              () => {
                setRevoking(null);
                router.refresh();
              },
            )
          }
        />
      )}
    </>
  );
}
