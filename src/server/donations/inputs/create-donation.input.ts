import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { isDateOnly } from "@/shared/dates/date-only";
import {
  DONOR_NAME_MAX,
  DONATION_NOTE_MAX,
  parseDonationAmount,
} from "../models/donation-rules";

export const donationRequestInputSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
export const createDonationInputSchema = z
  .object({
    cashBoxId: z.string().trim().min(1),
    amount: z.string().transform(parseDonationAmount).pipe(z.number()),
    donatedOn: z.string().refine(isDateOnly),
    donorName: z
      .string()
      .trim()
      .refine((value) => value.length <= DONOR_NAME_MAX),
    note: z
      .string()
      .trim()
      .refine((value) => value.length <= DONATION_NOTE_MAX),
  })
  .transform(({ amount, ...data }) => ({ ...data, amountCents: amount }));
export type DonationInput = z.input<typeof createDonationInputSchema>;
export function validateDonation(input: unknown) {
  return validateInput(
    createDonationInputSchema,
    input,
    "INVALID_DONATION_INPUT",
    {
      cashBoxId: "CASH_BOX_REQUIRED",
      amount: "INVALID_AMOUNT",
      donatedOn: "INVALID_DATE",
      donorName: "DONOR_NAME_TOO_LONG",
      note: "NOTE_TOO_LONG",
    },
  );
}
export function validateDonationRequest(input: unknown) {
  return validateInput(
    donationRequestInputSchema,
    input,
    "INVALID_DONATION_REQUEST",
  );
}
