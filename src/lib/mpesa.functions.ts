import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  phone_number: z.string().min(9).max(20),
  amount: z.number().positive(),
  account_reference: z.string().max(64).optional(),
  transaction_description: z.string().max(120).optional(),
});

/** initiate-mpesa-payment — sandbox M-PESA Express STK Push initiation. */
export const initiateMpesaPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { initiateStkPush } = await import("./mpesa.server");
    return initiateStkPush(data);
  });