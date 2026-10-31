import type { EventProduct } from "./event-product.model";
export interface OrderItem extends EventProduct {
  quantity: number;
}
