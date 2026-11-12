import { z } from "zod";
import type { OrderAddress } from "../models/order-address.model";

import { brazilianStates } from "@/server/addresses/models/brazilian-state.model";
import { postalCodeSchema } from "@/server/addresses/inputs/lookup-postal-code.input";
export { brazilianStates } from "@/server/addresses/models/brazilian-state.model";
export const emptyOrderAddress: OrderAddress = {
  postalCode: "",
  street: "",
  number: "",
  noNumber: false,
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  reference: "",
};
const text = (max: number) => z.string().trim().max(max);
export const orderAddressSchema = z
  .object({
    postalCode: z
      .string()
      .trim()
      .pipe(z.union([postalCodeSchema, z.literal("")])),
    street: text(100),
    number: text(20),
    noNumber: z.boolean(),
    complement: text(100),
    neighborhood: text(100),
    city: text(100),
    state: text(2).refine((v) => !v || brazilianStates.some((uf) => uf === v)),
    reference: text(500),
  })
  .superRefine((address, ctx) => {
    if (!Object.values(address).some(Boolean)) return;
    for (const field of ["street", "neighborhood", "city", "state"] as const)
      if (!address[field]) ctx.addIssue({ code: "custom", path: [field] });
    if (!address.noNumber && !address.number)
      ctx.addIssue({ code: "custom", path: ["number"] });
  })
  .transform((address) =>
    Object.values(address).some(Boolean)
      ? { ...address, number: address.noNumber ? "" : address.number }
      : null,
  );
const areaCodes = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);
export const contactPhoneSchema = text(20)
  .refine((v) => !v || /^[\d ()+.-]+$/.test(v))
  .transform((v) => v.replace(/[ ()+.-]/g, ""))
  .refine(
    (v) =>
      !v ||
      (areaCodes.has(Number(v.slice(0, 2))) &&
        /^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(v)),
  );
