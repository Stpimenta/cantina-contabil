import type { Event } from "@/server/events/models/event.model";
export type ProductCategory = Event & { kind: "product_category" };
