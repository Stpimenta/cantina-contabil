import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
import type {
  CashBoxHistoryEntry,
  CashBoxHistoryCategory,
} from "@/server/cash-boxes/models/cash-box-history-entry.model";
import type { Result } from "@/shared/errors/application-error";
import { PageFailure } from "@/components/ui/page-failure";
import { Pagination } from "@/components/ui/pagination";
import { FilterForm } from "@/components/ui/filter-form";
import { SelectField } from "@/components/ui/select-field";
import { CashBoxHistoryList } from "./cash-box-history-list";
export function CashBoxHistory({
  id,
  category,
  result,
}: {
  id: string;
  category: CashBoxHistoryCategory;
  result: Result<{ items: CashBoxHistoryEntry[]; total: number; page: number }>;
}) {
  return (
    <div className="stack">
      <FilterForm
        action={`/caixas/${id}`}
        fixedParams={{ history: "1" }}
        resetParams={{ category: "all" }}
        canReset={category !== "all"}
      >
        <SelectField
          id="history-category"
          label="Mostrar"
          name="category"
          value={category}
          options={[
            { value: "all", label: "Tudo" },
            { value: "events", label: "Eventos" },
            { value: "incoming", label: "Entradas" },
            { value: "outgoing", label: "Saídas" },
          ]}
        />
      </FilterForm>
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <>
          {result.value.items.length > 0 && (
            <CashBoxHistoryList entries={result.value.items} />
          )}
          <Pagination
            basePath={`/caixas/${id}`}
            pageKey="history"
            page={result.value.page}
            pageSize={DEFAULT_PAGE_SIZE}
            total={result.value.total}
            scroll={false}
            filters={{ category, history: "1" }}
          />
        </>
      )}
    </div>
  );
}
