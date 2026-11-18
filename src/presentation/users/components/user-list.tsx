"use client";
import styles from "./user-list.module.css";
import { formatDateTime } from "@/shared/formatting/date-time";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Field } from "@/components/ui/field";
import { FieldError } from "@/components/ui/field-error";
import { SelectField } from "@/components/ui/select-field";
import { SearchForm } from "@/components/ui/search-form";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionFeedback } from "@/components/ui/section-feedback";
import { Modal } from "@/components/modals/modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { useToast } from "@/components/ui/toast-provider";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import {
  validateInviteAccount,
  validateManageAccount,
} from "@/server/users/inputs/manage-account.input";
import {
  inviteAccountAction,
  manageAccountAction,
  cancelAccountInvitationAction,
} from "@/server/users/actions/manage-account.action";
export interface UserEntry {
  id: number;
  name: string;
  email: string;
  role: "admin" | "finance" | "operator";
  state: "pending" | "active" | "blocked";
  cashBoxIds: string[];
  cashBoxWriteIds: string[];
  eventIds: string[];
  eventWriteIds: string[];
  version: number;
  invitationExpiresAt?: number | null;
  invitationState?: string | null;
}
interface Data {
  items: UserEntry[];
  boxes: { id: string; name: string }[];
  events: { id: string; name: string; kind?: string }[];
  query: string;
  page: number;
  pageSize: number;
  total: number;
}
interface Draft {
  id: number;
  version: number;
  email: string;
  role: "admin" | "finance" | "operator";
  blocked: boolean;
  resending?: boolean;
  cashBoxIds: string[];
  cashBoxWriteIds: string[];
  eventIds: string[];
  eventWriteIds: string[];
}
export function UserList({ data }: { data?: Data }) {
  const router = useRouter(),
    notify = useToast(),
    [draft, setDraft] = useState<Draft | null>(null),
    [initial, setInitial] = useState(""),
    [confirmation, setConfirmation] = useState<
      "save" | "discard" | "cancel" | null
    >(null),
    [cancelled, setCancelled] = useState<UserEntry | null>(null);
  const invite = draft?.id === 0;
  const action = useServerAction({
    connectionMessage:
      "Não foi possível concluir. Confira a lista antes de repetir.",
    fieldIds: {
      email: "account-email",
      role: "account-role",
      cashBoxIds: "account-boxes",
      cashBoxWriteIds: "account-boxes",
      eventIds: "account-events",
      eventWriteIds: "account-events",
    },
    validationKey: JSON.stringify(draft),
    validate: () => {
      if (!draft) return null;
      const result = invite
        ? validateInviteAccount(draft)
        : validateManageAccount(draft);
      return result.ok ? null : presentBusinessFailure(result.error);
    },
  });
  const open = (user?: UserEntry) => {
    const value: Draft = user
      ? {
          id: user.id,
          version: user.version,
          email: user.email,
          role: user.role,
          blocked: user.state === "blocked",
          cashBoxIds: user.cashBoxIds,
          cashBoxWriteIds: user.cashBoxWriteIds,
          eventIds: user.eventIds,
          eventWriteIds: user.eventWriteIds,
        }
      : {
          id: 0,
          version: 1,
          email: "",
          role: "operator",
          blocked: false,
          cashBoxIds: [],
          cashBoxWriteIds: [],
          eventIds: [],
          eventWriteIds: [],
        };
    setDraft(value);
    setInitial(JSON.stringify(value));
  };
  const close = () => {
    if (action.pending) return;
    if (JSON.stringify(draft) !== initial) setConfirmation("discard");
    else setDraft(null);
  };
  const saved = (message: string) => {
    setDraft(null);
    setCancelled(null);
    setConfirmation(null);
    notify(message);
    router.refresh();
  };
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const result = invite
      ? validateInviteAccount(draft)
      : validateManageAccount(draft);
    if (!result.ok) {
      action.showError(presentBusinessFailure(result.error));
      return;
    }
    if (invite)
      action.execute(
        () => inviteAccountAction(draft),
        () => saved("Convite enviado."),
      );
    else setConfirmation("save");
  }
  return (
    <div className="stack" aria-busy={!data || undefined}>
      <PageHeader
        title="Usuários"
        icon="user"
        description="Convites, perfis e permissões"
        hideDescriptionOnMobile
        compactActionsOnMobile
        actions={
          <Button
            disabled={!data || action.pending}
            mobileIcon={<Icon name="plus" />}
            onClick={() => open()}
          >
            Convidar usuário
          </Button>
        }
      />
      <SearchForm
        action="/users"
        query={data?.query ?? ""}
        label="Buscar por nome ou e-mail"
        disabled={!data}
      />
      {!data ? (
        <>
          <span className="sr-only" role="status">
            Carregando usuários
          </span>
          <ul className="record-list">
            {[0, 1, 2].map((key) => (
              <li className="record-row" key={key}>
                <div className="stack-small">
                  <Skeleton />
                  <Skeleton />
                </div>
                <Button disabled variant="neutral">
                  Editar acesso
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : data.items.length === 0 ? (
        <SectionFeedback area="historico">
          Nenhum usuário encontrado.
        </SectionFeedback>
      ) : (
        <ul className="record-list">
          {data.items.map((user) => (
            <li key={user.id} className="record-row">
              <div className="stack-small">
                <p className="record-title">{user.name}</p>
                {user.name !== user.email && (
                  <p className="record-meta">{user.email}</p>
                )}
                <p className="record-meta">
                  {user.role === "admin"
                    ? "Administrador · Acesso completo"
                    : user.role === "finance"
                      ? `Financeiro · ${user.cashBoxIds.length} caixa(s)`
                      : `Operador · ${user.eventIds.length} evento(s)/grupo(s)`}{" "}
                  ·{" "}
                  {user.state === "pending"
                    ? user.invitationState === "cancelled"
                      ? "Convite cancelado"
                      : user.invitationState === "expired"
                        ? "Convite expirado"
                        : "Aguardando ativação"
                    : user.state === "blocked"
                      ? "Bloqueado"
                      : "Ativo"}
                </p>
                {user.state === "pending" && user.invitationExpiresAt && (
                  <p className="record-meta">
                    Vencimento:{" "}
                    {formatDateTime(
                      new Date(user.invitationExpiresAt * 1000).toISOString(),
                    )}
                  </p>
                )}
              </div>
              <div className="action-group">
                {user.state === "pending" && (
                  <Button
                    variant="neutral"
                    disabled={action.pending}
                    onClick={() => {
                      const value: Draft = {
                        ...user,
                        id: 0,
                        blocked: false,
                        resending: true,
                      };
                      setDraft(value);
                      setInitial(JSON.stringify(value));
                    }}
                  >
                    Reenviar convite
                  </Button>
                )}
                <Button
                  variant="neutral"
                  disabled={action.pending}
                  onClick={() => open(user)}
                >
                  Editar acesso
                </Button>
                {user.state === "pending" &&
                  user.invitationState === "pending" && (
                    <Button
                      variant="ghost"
                      disabled={action.pending}
                      onClick={() => {
                        setCancelled(user);
                        setConfirmation("cancel");
                      }}
                    >
                      Cancelar convite
                    </Button>
                  )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && (
        <Pagination
          basePath="/users"
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          query={data.query}
        />
      )}
      {draft && (
        <Modal
          open
          title={
            draft.resending
              ? "Reenviar convite"
              : invite
                ? "Convidar usuário"
                : "Editar acesso"
          }
          size="formCompact"
          onClose={close}
          footer={
            <>
              <Button
                variant="neutral"
                disabled={action.pending}
                onClick={close}
              >
                Cancelar
              </Button>
              <Button type="submit" form="account-form" busy={action.pending}>
                {draft.resending
                  ? "Reenviar convite"
                  : invite
                    ? "Enviar convite"
                    : "Salvar acesso"}
              </Button>
            </>
          }
        >
          <form
            id="account-form"
            className="stack"
            noValidate
            onSubmit={submit}
          >
            <div className="form-grid">
              {invite ? (
                <Field
                  id="account-email"
                  label="E-mail do convite"
                  name="email"
                  type="email"
                  value={draft.email}
                  required
                  maxLength={254}
                  error={action.fields?.email}
                  disabled={action.pending || draft.resending}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value })
                  }
                />
              ) : (
                <div className={styles.identity}>
                  <span className="record-meta">Usuário</span>
                  <p>{draft.email}</p>
                </div>
              )}
              <SelectField
                id="account-role"
                label="Perfil"
                value={draft.role}
                options={[
                  { value: "admin", label: "Administrador" },
                  { value: "finance", label: "Financeiro" },
                  { value: "operator", label: "Operador" },
                ]}
                error={action.fields?.role}
                disabled={action.pending || draft.resending}
                onValueChange={(value) =>
                  setDraft({
                    ...draft,
                    role: value as Draft["role"],
                    cashBoxIds: [],
                    cashBoxWriteIds: [],
                    eventIds: [],
                    eventWriteIds: [],
                  })
                }
              />
              {!invite && (
                <SelectField
                  id="account-state"
                  label="Situação do acesso"
                  value={draft.blocked ? "blocked" : "enabled"}
                  options={[
                    { value: "enabled", label: "Habilitado" },
                    { value: "blocked", label: "Bloqueado" },
                  ]}
                  disabled={action.pending || draft.resending}
                  onValueChange={(value) =>
                    setDraft({ ...draft, blocked: value === "blocked" })
                  }
                />
              )}
            </div>
            {draft.role === "admin" ? (
              <p className={styles.summary}>
                Acesso completo a todas as áreas e ao gerenciamento de usuários.
              </p>
            ) : (
              (() => {
                const financial = draft.role === "finance";
                const readKey = financial ? "cashBoxIds" : "eventIds";
                const writeKey = financial
                  ? "cashBoxWriteIds"
                  : "eventWriteIds";
                const groupId = financial ? "account-boxes" : "account-events";
                const options = (financial ? data?.boxes : data?.events) ?? [];
                const groups = financial
                  ? [{ id: "boxes", title: "Caixas", empty: "Nenhum caixa disponível.", items: options }]
                  : [
                      { id: "events", title: "Eventos", empty: "Nenhum evento disponível.", items: options.filter(option => !("kind" in option) || option.kind !== "product_category") },
                      { id: "products", title: "Produtos", empty: "Nenhum grupo de produtos disponível.", items: options.filter(option => "kind" in option && option.kind === "product_category") },
                    ];
                const groupError =
                  action.fields?.[readKey] ?? action.fields?.[writeKey];
                return (
                  <section
                    className={styles.permissions}
                    id={groupId}
                    role="group"
                    aria-label={financial ? "Permissões dos caixas" : "Permissões de eventos e produtos"}
                    aria-invalid={!!groupError}
                    aria-describedby={
                      groupError ? `${groupId}-error` : undefined
                    }
                    tabIndex={-1}
                  >
                    {groups.map(group => (
                      <section key={group.id} className="stack-small" aria-labelledby={`${groupId}-${group.id}-label`}>
                        <h3 id={`${groupId}-${group.id}-label`}>{group.title}</h3>
                    {group.items.length ? (
                      <ul className={styles.accessList}>
                        {group.items.map((option) => (
                          <li
                            key={option.id}
                            className={styles.accessRow}
                            role="group"
                            aria-labelledby={`resource-${option.id}`}
                          >
                            <div className={styles.resourceHeading} data-authorized={draft[readKey].includes(option.id) || undefined}>
                              <Icon name={financial || ("kind" in option && option.kind === "product_category") ? "box" : "calendar"} />
                              <span
                                id={`resource-${option.id}`}
                                className={styles.accessName}
                              >
                                {option.name}
                              </span>
                            </div>
                            <PermissionChoice
                              id={`permission-${option.id}`}
                              name={option.name}
                              value={!draft[readKey].includes(option.id) ? "none" : draft[writeKey].includes(option.id) ? "write" : "read"}
                              disabled={!!(action.pending || draft.resending)}
                              onChange={value => setDraft({
                                ...draft,
                                [readKey]: value === "none"
                                  ? draft[readKey].filter(id => id !== option.id)
                                  : [...draft[readKey].filter(id => id !== option.id), option.id],
                                [writeKey]: value === "write"
                                  ? [...draft[writeKey].filter(id => id !== option.id), option.id]
                                  : draft[writeKey].filter(id => id !== option.id),
                              })}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="record-meta">
                        {group.empty}
                      </p>
                    )}
                    <p className={styles.summary}>
                      {group.items.filter(option => draft[readKey].includes(option.id)).length} autorizado(s) ·{" "}
                      {group.items.filter(option => draft[writeKey].includes(option.id)).length} com alteração
                    </p>
                      </section>
                    ))}
                    <FieldError id={`${groupId}-error`} error={groupError} />
                  </section>
                );
              })()
            )}
          </form>
        </Modal>
      )}
      {confirmation && (
        <ConfirmationModal
          title={
            confirmation === "save"
              ? "Salvar acesso?"
              : confirmation === "cancel"
                ? "Cancelar convite?"
                : "Descartar alterações?"
          }
          message={
            confirmation === "save"
              ? "As novas permissões serão aplicadas nas próximas operações do usuário."
              : confirmation === "cancel"
                ? "O convite deixará de habilitar esta conta."
                : "As alterações deste formulário serão perdidas."
          }
          confirmLabel={
            confirmation === "save"
              ? "Salvar acesso"
              : confirmation === "cancel"
                ? "Cancelar convite"
                : "Descartar"
          }
          busy={action.pending}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            if (confirmation === "discard") {
              setDraft(null);
              setConfirmation(null);
            } else if (confirmation === "save" && draft)
              action.execute(
                () => manageAccountAction(draft),
                () => saved("Acesso atualizado."),
              );
            else if (cancelled)
              action.execute(
                () =>
                  cancelAccountInvitationAction({
                    ...cancelled,
                    blocked: false,
                  }),
                () => saved("Convite cancelado."),
              );
          }}
        />
      )}
      <ErrorModal error={action.error} onClose={action.closeError} />
    </div>
  );
}

const permissionOptions = [
  { value: "none", label: "Sem acesso" },
  { value: "read", label: "Consulta" },
  { value: "write", label: "Alteração" },
] as const;

function PermissionChoice({ id, name, value, disabled, onChange }: {
  id: string;
  name: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return <>
    <div className={styles.accessSelect}>
      <SelectField id={id} label="Permissão" value={value} options={permissionOptions} disabled={disabled} onValueChange={onChange} />
    </div>
    <div className={styles.accessChoices} role="group" aria-label={`Permissão para ${name}`}>
      {permissionOptions.map(option => <Button key={option.value} type="button" variant={value === option.value ? "primary" : "ghost"} aria-pressed={value === option.value} disabled={disabled} onClick={() => onChange(option.value)}>{option.label}</Button>)}
    </div>
  </>;
}
