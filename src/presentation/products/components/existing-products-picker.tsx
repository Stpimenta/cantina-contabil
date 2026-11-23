"use client";
import { useId, useState } from "react";
import { Modal } from "@/components/modals/modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/button";
import { ProductIcon } from "@/components/ui/product-icon";
import styles from "./existing-products-picker.module.css";
import { formatCurrency } from "@/shared/formatting/currency";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import type { StockImportOption } from "@/server/products/models/stock-import-option.model";
export function ExistingProductsPicker({
  options,
  limit,
  onChoose,
  onClose,
}: {
  options: StockImportOption[];
  limit: number;
  onChoose: (products: StockImportOption[]) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [sourceGroup, setSourceGroup] = useState("");
  const [selected, setSelected] = useState<StockImportOption[]>([]),
    [discard, setDiscard] = useState(false);
  const groups = [
    ...new Map(
      options.map((option) => [
        option.sourceCategoryId,
        { value: option.sourceCategoryId, label: option.categoryName },
      ]),
    ).values(),
  ];
  const visibleOptions = options.filter(
    (option) => option.sourceCategoryId === sourceGroup,
  );
  const outsideCount = selected.filter(
    (option) => option.sourceCategoryId !== sourceGroup,
  ).length;
  useUnsavedChanges(selected.length > 0);
  function close() {
    if (selected.length) setDiscard(true);
    else onClose();
  }
  function toggle(product: StockImportOption, checked: boolean) {
    setSelected((current) => {
      if (!checked)
        return current.filter(
          (item) =>
            item.sourceCategoryId !== product.sourceCategoryId ||
            item.sourceProductId !== product.sourceProductId,
        );
      if (
        current.length >= limit ||
        current.some((item) => item.sourceStockId === product.sourceStockId)
      )
        return current;
      return [...current, product];
    });
  }
  return (
    <>
      <Modal
        open
        size="formCompact"
        title="Selecionar produtos existentes"
        onClose={close}
        footer={
          <>
            <Button variant="neutral" onClick={close}>
              Cancelar
            </Button>
            <Button
              disabled={!selected.length}
              aria-label={`Confirmar seleção de ${selected.length} ${selected.length === 1 ? "produto" : "produtos"}`}
              onClick={() => onChoose(selected)}
            >
              Selecionados ({selected.length})
            </Button>
          </>
        }
      >
        <div className={styles.content}>
          <p className="muted record-meta">
            O estoque será compartilhado ao salvar o grupo. Os preços podem ser
            ajustados no formulário.
          </p>
          {options.length ? (
            <SelectField
              id={`${id}-group`}
              label="Grupo de origem"
              value={sourceGroup}
              options={[
                { value: "", label: "Selecione um grupo" },
                ...groups.map((group) => {
                  const count = selected.filter(
                    (product) => product.sourceCategoryId === group.value,
                  ).length;
                  return {
                    ...group,
                    label: count
                      ? `${group.label} (${count} ${count === 1 ? "selecionado" : "selecionados"})`
                      : group.label,
                  };
                }),
              ]}
              onValueChange={setSourceGroup}
            />
          ) : (
            <p className="muted">
              Nenhum produto disponível. Os produtos já presentes no grupo e os
              sem permissão de alteração são excluídos da seleção.
            </p>
          )}
          {sourceGroup && (
            <section
              className={styles.selected}
              aria-labelledby={`${id}-products`}
            >
              <div className={styles.heading}>
                <h2 id={`${id}-products`}>Produtos</h2>
                <p className="muted record-meta" role="status">
                  {selected.length}{" "}
                  {selected.length === 1 ? "selecionado" : "selecionados"}
                </p>
              </div>
              <ul className="record-list">
                {visibleOptions.map((product) => {
                  const picked = selected.find(
                    (item) => item.sourceStockId === product.sourceStockId,
                  );
                  const checked =
                    !!picked &&
                    picked.sourceCategoryId === product.sourceCategoryId &&
                    picked.sourceProductId === product.sourceProductId;
                  const disabled =
                    !checked && (!!picked || selected.length >= limit);
                  return (
                    <li
                      key={`${product.sourceCategoryId}:${product.sourceProductId}`}
                    >
                      <label
                        className={styles.row}
                        title={
                          picked && !checked
                            ? "Este estoque já foi selecionado por outro produto."
                            : undefined
                        }
                      >
                        <span className={styles.details}>
                          <span
                            id={`${id}-${product.sourceProductId}-name`}
                            className={styles.name}
                          >
                            <ProductIcon name={product.product.icon} />
                            <span>{product.product.name}</span>
                          </span>
                          <span
                            id={`${id}-${product.sourceProductId}-price`}
                            className={`muted record-meta ${styles.price}`}
                          >
                            {formatCurrency(product.product.priceCents)}
                          </span>
                        </span>
                        <input
                          className={styles.checkbox}
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          aria-labelledby={`${id}-${product.sourceProductId}-name`}
                          aria-describedby={`${id}-${product.sourceProductId}-price`}
                          onChange={(event) =>
                            toggle(product, event.target.checked)
                          }
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
              {outsideCount > 0 && (
                <p className="muted record-meta">
                  {outsideCount}{" "}
                  {outsideCount === 1
                    ? "produto selecionado em outro grupo"
                    : "produtos selecionados em outros grupos"}
                  .
                </p>
              )}
              {selected.length >= limit && (
                <p className="muted record-meta" role="status">
                  Não há espaço para mais produtos neste grupo. Desmarque um
                  item para escolher outro.
                </p>
              )}
            </section>
          )}
        </div>
      </Modal>
      {discard && (
        <ConfirmationModal
          title="Descartar seleção?"
          message="Os produtos selecionados ainda não foram adicionados ao formulário."
          confirmLabel="Descartar"
          onConfirm={onClose}
          onCancel={() => setDiscard(false)}
        />
      )}
    </>
  );
}
