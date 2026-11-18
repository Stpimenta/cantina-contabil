import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/ui/search-form";
import styles from "@/app/(authenticated)/products/[id]/page.module.css";
export type ProductsLoadingSection =
  "list" | "detail" | "orders" | "supplies" | "stock";
export function ProductsLoading({
  section,
}: {
  section: ProductsLoadingSection;
}) {
  const detail = section === "detail";
  const list = section === "list";
  const title = list ? (
    "Produtos"
  ) : detail ? (
    <Skeleton shape="title" />
  ) : section === "orders" ? (
    "Pedidos"
  ) : section === "supplies" ? (
    "Insumos"
  ) : (
    "Entradas de estoque"
  );
  return (
    <div className="stack" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando
      </span>
      {!list && (
        <Breadcrumbs
          loading
          items={[
            { label: "Home", href: "/" },
            { label: "Produtos", href: "/products" },
            { label: "Grupo", ...(detail ? {} : { href: "/products" }) },
            ...(!detail
              ? [{ label: typeof title === "string" ? title : "" }]
              : []),
          ]}
        />
      )}
      <PageHeader
        title={title}
        icon={list || detail ? "box" : undefined}
        compactActionsOnMobile
        hideDescriptionOnMobile={list}
        description={
          list ? (
            "Vendas recorrentes organizadas por grupo de produtos."
          ) : detail ? (
            "Grupo de produtos"
          ) : (
            <Skeleton />
          )
        }
        actions={
          list || section === "orders" || section === "supplies" ? (
            <Button disabled>
              {list
                ? "Novo grupo"
                : section === "orders"
                  ? "Adicionar pedido"
                  : "Adicionar insumo"}
            </Button>
          ) : detail ? (
            <>
              <Button variant="neutral" disabled>
                Editar grupo
              </Button>
              <Button variant="danger" disabled>
                Excluir grupo
              </Button>
            </>
          ) : undefined
        }
      />
      {detail ? (
        <>
          <section className="stack">
            <h2>Situação financeira</h2>
            <div className="inline">
              <Skeleton shape="amount" />
              <Skeleton shape="amount" />
            </div>
            <div className={styles.actions}>
              {["Pedidos", "Insumos", "Histórico"].map((label) => (
                <Button
                  size="large"
                  compactOnMobile
                  className="wide-action"
                  variant="neutral"
                  disabled
                  key={label}
                >
                  {label}
                </Button>
              ))}
            </div>
          </section>
          <section className="stack">
            <h2>Produtos e estoque</h2>
            <Rows />
          </section>
          <dl className="details">
            <div>
              <dt>Caixa</dt>
              <dd>
                <Skeleton />
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <>
          {(list || section === "orders") && (
            <SearchForm
              action="/products"
              query=""
              label="Buscar pelo nome"
              disabled
            />
          )}
          {section === "supplies" && (
            <p className="muted record-meta">
              Total em compras: <Skeleton shape="amount" />
            </p>
          )}
          <Rows />
        </>
      )}
    </div>
  );
}
function Rows() {
  return (
    <ul className="record-list" aria-hidden="true">
      {[0, 1, 2].map((n) => (
        <li className="record-row" key={n}>
          <div className="stack-small">
            <Skeleton shape="title" />
            <Skeleton />
            <Skeleton shape="short" />
          </div>
          <Skeleton shape="control" />
        </li>
      ))}
    </ul>
  );
}
