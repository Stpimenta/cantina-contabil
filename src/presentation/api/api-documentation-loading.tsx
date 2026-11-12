import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
export function ApiDocumentationLoading() {
  return (
    <section
      className="stack"
      aria-busy="true"
      aria-label="Documentação da API"
    >
      <span role="status" className="sr-only">
        Carregando documentação da API
      </span>
      <PageHeader title="Documentação da API" />
      <Skeleton shape="title" />
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </section>
  );
}
