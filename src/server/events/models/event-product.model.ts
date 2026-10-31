import type { ProductIconId } from "@/shared/products/product-icons";
export interface EventProduct {
  id: string;
  name: string;
  icon: ProductIconId;
  priceCents: number;
}
