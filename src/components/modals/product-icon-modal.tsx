"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Modal } from "./modal";
import { Button } from "../ui/button";
import { ProductIcon } from "../ui/product-icon";
import {
  productIcons,
  type ProductIconId,
} from "@/shared/products/product-icons";
import styles from "./product-icon-modal.module.css";
const categories: string[] = Array.from(
  new Set(productIcons.map((icon) => icon.category)),
);
export function ProductIconModal({
  value,
  onChoose,
  onClose,
  title = "Ícone do produto",
}: {
  value: ProductIconId;
  title?: string;
  onChoose: (value: ProductIconId) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [category, setCategory] = useState<string>(
    productIcons.find((icon) => icon.id === value)?.category ?? categories[0],
  );
  const categoryList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = categoryList.current;
    const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !selected || list.scrollWidth <= list.clientWidth) return;
    const listBounds = list.getBoundingClientRect();
    const selectedBounds = selected.getBoundingClientRect();
    list.scrollTo({
      left:
        list.scrollLeft +
        selectedBounds.left -
        listBounds.left -
        (list.clientWidth - selectedBounds.width) / 2,
    });
  }, [category]);
  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      footer={
        <Button variant="neutral" onClick={onClose}>
          Cancelar
        </Button>
      }
    >
      <div className="stack">
        <div
          ref={categoryList}
          className={`action-group ${styles.categories}`}
          role="tablist"
          aria-label="Categorias de ícones"
        >
          {categories.map((name, index) => (
            <Button
              key={name}
              type="button"
              id={`${id}-tab-${index}`}
              role="tab"
              aria-selected={category === name}
              aria-controls={`${id}-panel`}
              tabIndex={category === name ? 0 : -1}
              variant={category === name ? "neutral" : "ghost"}
              onClick={() => setCategory(name)}
              onKeyDown={(event) => {
                if (
                  ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? categories.length - 1
                        : (index +
                            (event.key === "ArrowRight" ? 1 : -1) +
                            categories.length) %
                          categories.length;
                  setCategory(categories[next]);
                  document
                    .getElementById(`${id}-tab-${next}`)
                    ?.focus({ preventScroll: true });
                }
              }}
            >
              {name}
            </Button>
          ))}
        </div>
        <div
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${categories.indexOf(category)}`}
          className={styles.grid}
        >
          {productIcons
            .filter((icon) => icon.category === category)
            .map((icon) => (
              <Button
                key={icon.id}
                type="button"
                iconOnly
                className={styles.option}
                variant={value === icon.id ? "primary" : "neutral"}
                aria-label={icon.label}
                title={icon.label}
                aria-pressed={value === icon.id}
                onClick={() => onChoose(icon.id)}
              >
                <ProductIcon name={icon.id} />
              </Button>
            ))}
        </div>
      </div>
    </Modal>
  );
}
