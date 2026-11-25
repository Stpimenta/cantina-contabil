import { stockConfirmationSchema } from "@/server/products/inputs/stock-confirmation.input";
import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import {
  orderAddressSchema,
  contactPhoneSchema,
} from "@/server/events/inputs/order-delivery.input";
import { temporaryAccessSchema } from "@/server/canteen/inputs/command.input";
const meta = { requestId: z.uuid(), version: z.number().int().nonnegative() };
export const driverSchema = z.object({
  ...meta,
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  phone: contactPhoneSchema,
});
export const settingsSchema = z.object({
  ...meta,
  origin: orderAddressSchema.refine((a) => a !== null),
  driverIds: z.array(z.uuid()).refine((a) => new Set(a).size === a.length),
});
export const routeSchema = z.object({
  ...meta,
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  driverId: z.uuid(),
  orderIds: z
    .array(z.uuid())
    .min(1)
    .refine((a) => new Set(a).size === a.length),
});
export const routeChangeSchema = z.object({
  requestId: z.uuid(),
  version: z.number().int().positive(),
});
export const moveSchema = z
  .object({
    requestId: z.uuid(),
    fromId: z.uuid(),
    fromVersion: z.number().int().positive(),
    toId: z.uuid(),
    toVersion: z.number().int().positive(),
    orderId: z.uuid(),
  })
  .refine((a) => a.fromId !== a.toId);
export const deliverSchema = z.object({
  requestId: z.uuid(),
  routeId: z.uuid(),
  version: z.number().int().positive(),
  fulfilled: z.boolean(),
  stockConfirmation: stockConfirmationSchema.optional(),
});
export const deliveryAccessSchema = temporaryAccessSchema.extend({
  driverId: z.uuid(),
});
export const validateDriver = (v: unknown) =>
  validateInput(driverSchema, v, "INVALID_DELIVERY_INPUT", {
    name: "INVALID_ACCESS_NAME",
    phone: "INVALID_CONTACT_PHONE",
  });
export const validateSettings = (v: unknown) =>
  validateInput(settingsSchema, v, "INVALID_DELIVERY_INPUT", {
    origin: "INVALID_ORDER_ADDRESS",
    driverIds: "INVALID_DELIVERY_DRIVERS",
  });
export const validateRoute = (v: unknown) =>
  validateInput(routeSchema, v, "INVALID_DELIVERY_INPUT", {
    name: "INVALID_ACCESS_NAME",
    driverId: "INVALID_DELIVERY_DRIVERS",
    orderIds: "INVALID_DELIVERY_ORDERS",
  });
export const validateDeliveryAccess = (v: unknown) =>
  validateInput(deliveryAccessSchema, v, "INVALID_TEMP_ACCESS", {
    driverId: "INVALID_DELIVERY_DRIVERS",
    name: "INVALID_ACCESS_NAME",
    expiresAt: "INVALID_ACCESS_EXPIRY",
  });
export const validateDeliveryId = (v: unknown) =>
  validateInput(z.uuid(), v, "INVALID_DELIVERY_INPUT");
export const validateRouteChange = (v: unknown) =>
  validateInput(routeChangeSchema, v, "INVALID_DELIVERY_INPUT");
export const validateMove = (v: unknown) =>
  validateInput(moveSchema, v, "INVALID_DELIVERY_INPUT", {
    toId: "INVALID_DELIVERY_DRIVERS",
  });
export const validateDeliver = (v: unknown) =>
  validateInput(deliverSchema, v, "INVALID_DELIVERY_INPUT");
export const validateDeliveryQuery = (v: unknown) =>
  validateInput(
    z.object({
      q: z
        .string()
        .catch("")
        .transform((s) => s.trim().slice(0, 100)),
      page: z.coerce.number().int().positive().catch(1),
    }),
    v,
    "INVALID_FILTER",
  );
