import { PageHeader } from "./page-header";
import { Breadcrumbs } from "./breadcrumbs";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { SearchForm } from "../ui/search-form";
import { Skeleton } from "../ui/skeleton";
import { HomeOverview } from "@/presentation/home/components/home-overview";
import homePageStyles from "@/app/(authenticated)/page.module.css";
import eventStyles from "@/app/(authenticated)/eventos/[id]/page.module.css";
import donationStyles from "@/presentation/donations/components/donation-list.module.css";
import supplyStyles from "@/presentation/events/components/supply-list.module.css";
import balanceStyles from "@/presentation/cash-boxes/components/cash-box-balance.module.css";
import styles from "./route-loading.module.css";

const areas = {
  home: {
    title: "Home",
    icon: "home",
    description: "Seu resumo no Ministério Contábil.",
  },
  caixas: {
    title: "Caixas",
    icon: "box",
    description: "Organize os caixas por finalidade.",
  },
  caixa: { title: "Caixa", icon: "box", description: "Detalhes do caixa" },
  doacoes: {
    title: "Doações",
    icon: "donation",
    description: "Recebimentos destinados aos caixas.",
  },
  movimentacoes: {
    title: "Movimentações",
    icon: "movements",
    description: "Entradas e saídas dos caixas",
  },
  eventos: {
    title: "Eventos",
    icon: "calendar",
    description: "Pedidos, produtos e insumos de cada evento.",
  },
  evento: {
    title: "Evento",
    icon: "calendar",
    description: "Detalhes do evento",
  },
  pedidos: { title: "Pedidos", icon: undefined, description: undefined },
  insumos: { title: "Insumos", icon: undefined, description: undefined },
} as const;
export type LoadingArea = keyof typeof areas;

export function loadingAreaForPath(pathname: string): LoadingArea {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "caixas") return segments[1] ? "caixa" : "caixas";
  if (segments[0] === "eventos") {
    if (segments[2] === "pedidos") return "pedidos";
    if (segments[2] === "insumos") return "insumos";
    return segments[1] ? "evento" : "eventos";
  }
  if (segments[0] === "doacoes") return "doacoes";
  if (segments[0] === "movimentacoes") return "movimentacoes";
  return "home";
}

const creation = {
  caixas: "Novo caixa",
  doacoes: "Nova doação",
  movimentacoes: "Nova movimentação",
  eventos: "Novo evento",
  pedidos: "Adicionar pedido",
  insumos: "Adicionar insumo",
} as const;

function LoadingActions({ area }: { area: LoadingArea }) {
  if (area === "home") return null;
  if (area === "caixa" || area === "evento")
    return (
      <>
        <Button
          disabled
          variant="neutral"
          mobileIcon={<Icon name="edit" />}
          iconBreakpoint="tablet"
        >
          {area === "caixa" ? "Editar caixa" : "Editar evento"}
        </Button>
        <Button
          disabled
          variant="danger"
          mobileIcon={<Icon name="trash" />}
          iconBreakpoint="tablet"
        >
          <Icon name="trash" />
          {area === "caixa" ? "Excluir caixa" : "Excluir evento"}
        </Button>
      </>
    );
  return (
    <Button
      disabled
      mobileIcon={area === "doacoes" ? undefined : <Icon name="plus" />}
    >
      {creation[area]}
    </Button>
  );
}

function BalancePlaceholder() {
  return (
    <div className={balanceStyles.root}>
      <div className="stack-small">
        <p className="muted record-meta">Real</p>
        <Skeleton shape="total" />
      </div>
      <div className="stack-small">
        <p className="muted record-meta">Pendente</p>
        <Skeleton shape="amount" />
      </div>
    </div>
  );
}

export function RouteLoading({ area }: { area: LoadingArea }) {
  const { title, icon, description } = areas[area];
  const detail = area === "caixa" || area === "evento";
  const nested = detail || area === "pedidos" || area === "insumos";
  const search =
    area === "caixas" ||
    area === "doacoes" ||
    area === "eventos" ||
    area === "pedidos";
  return (
    <section
      className={
        area === "home"
          ? homePageStyles.page
          : area === "evento"
            ? eventStyles.page
            : "stack"
      }
      aria-label={title}
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        Carregando {title.toLocaleLowerCase("pt-BR")}…
      </span>
      {nested && (
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            {
              label: area === "caixa" ? "Caixas" : "Eventos",
              href: area === "caixa" ? "/caixas" : "/eventos",
            },
            ...(!detail ? [{ label: "Evento" }] : []),
            { label: title },
          ]}
        />
      )}
      <PageHeader
        title={area === "home" || detail ? <Skeleton shape="title" /> : title}
        icon={icon}
        description={
          area === "pedidos" || area === "insumos" ? (
            <span>
              Evento: <Skeleton shape="amount" />
            </span>
          ) : (
            description
          )
        }
        hideDescriptionOnMobile={!nested}
        compactActionsOnMobile={area !== "home" && area !== "doacoes"}
        actions={area === "home" ? undefined : <LoadingActions area={area} />}
      />
      {area === "home" ? (
        <HomeOverview />
      ) : detail ? (
        <>
          {area === "evento" ? (
            <section className={eventStyles.financial}>
              <h2>Situação financeira</h2>
              <div className={eventStyles.summary}>
                <BalancePlaceholder />
                <div className={`muted record-meta ${eventStyles.payments}`}>
                  {["Dinheiro", "Pix", "Insumos"].map((label) => (
                    <p key={label}>
                      <span>{label}:</span> <Skeleton shape="amount" />
                    </p>
                  ))}
                </div>
                <div className={eventStyles.statistics}>
                  <div className={eventStyles.metric}>
                    <p className="muted record-meta">Produtos vendidos</p>
                    <Skeleton shape="amount" />
                  </div>
                </div>
              </div>
              <div className={eventStyles.actions}>
                {["Pedidos", "Insumos", "Histórico"].map((label, index) => (
                  <Button
                    key={label}
                    disabled
                    variant={index === 0 ? "primary" : "neutral"}
                    size="large"
                    compactOnMobile
                    className="wide-action"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </section>
          ) : (
            <BalancePlaceholder />
          )}
          <section
            className={area === "evento" ? eventStyles.information : "stack"}
          >
            {area === "evento" && <h2>Informações do evento</h2>}
            <dl
              className={
                area === "evento"
                  ? `details ${eventStyles.eventDetails}`
                  : "details"
              }
            >
              {(area === "evento"
                ? ["Data", "Caixa"]
                : ["Descrição", "Criado por"]
              ).map((label) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <Skeleton />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          {area === "caixa" && (
            <div className="centered-actions">
              <Button disabled variant="neutral">
                Histórico
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {search && (
            <SearchForm
              action={area === "pedidos" ? "/eventos" : `/${area}`}
              query=""
              label={
                area === "caixas"
                  ? "Buscar caixa por nome"
                  : area === "eventos"
                    ? "Buscar evento por nome"
                    : area === "doacoes"
                      ? "Buscar por doador"
                      : "Buscar pedido pelo nome da pessoa"
              }
              disabled
              actions={
                area === "doacoes" || area === "pedidos" ? (
                  <Button disabled variant="neutral">
                    <Icon name="filter" />
                    Filtros
                  </Button>
                ) : undefined
              }
            />
          )}
          <div
            aria-hidden="true"
            className={area === "insumos" ? supplyStyles.list : "record-list"}
          >
            {[0, 1, 2].map((item) => (
              <LoadingRow key={item} area={area} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function LoadingRow({ area }: { area: LoadingArea }) {
  if (area === "insumos")
    return (
      <div className={supplyStyles.card}>
        <div className={supplyStyles.details}>
          <div className={styles.name}>
            <Skeleton shape="control" />
            <Skeleton />
          </div>
          <Skeleton shape="amount" />
          <Skeleton shape="short" />
        </div>
        <Skeleton shape="control" />
      </div>
    );
  if (area === "doacoes")
    return (
      <div className={`record-row ${donationStyles.row}`}>
        <div className={`stack-small ${donationStyles.content}`}>
          <Skeleton />
          <div className={donationStyles.amount}>
            <Skeleton shape="amount" />
          </div>
          <div className={donationStyles.metadata}>
            <Skeleton shape="short" />
          </div>
        </div>
        <Skeleton shape="control" />
      </div>
    );
  return (
    <div className="record-row record-row-centered">
      <div className={`stack-small ${styles.content}`}>
        <Skeleton />
        {area === "movimentacoes" && <Skeleton shape="amount" />}
        <Skeleton shape="short" />
        {area === "pedidos" && <Skeleton />}
      </div>
      {area === "caixas" || area === "eventos" ? (
        <div className={balanceStyles.root}>
          <div className="stack-small">
            <p className="muted record-meta">Real</p>
            <Skeleton shape="amount" />
          </div>
          <div className="stack-small">
            <p className="muted record-meta">Pendente</p>
            <Skeleton shape="amount" />
          </div>
        </div>
      ) : (
        <div className="action-group">
          <Skeleton shape="control" />
          {area === "pedidos" && <Skeleton shape="control" />}
        </div>
      )}
    </div>
  );
}
