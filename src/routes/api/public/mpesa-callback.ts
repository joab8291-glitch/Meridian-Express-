import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// M-PESA Daraja STK Push callback endpoint.
//
// This route lives under /api/public/* so it bypasses Lovable's published-site
// auth and is reachable by Safaricom's servers with no JWT or frontend session.
// Safaricom POSTs the STK Push callback result here as JSON.
//
// The handler parses Body.stkCallback, extracts the result + (when present)
// CallbackMetadata fields, and persists them into the private `mpesa_payments`
// table using the service-role backend client (RLS-bypassing, server-only).
// Duplicate callbacks are de-duplicated on CheckoutRequestID via upsert.
//
// It does NOT update orders, products, stock, or customer checkout, and it does
// NOT initiate new STK Push requests. No M-PESA PINs, OTPs, Consumer Secret,
// Passkey, or access tokens are stored — Daraja never sends them on this callback.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type",
};

type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

// Map Safaricom ResultCode -> internal payment_status.
//   0    = paid (success)
//   1032 = cancelled by the user
//   anything else = failed
function statusForResultCode(code: number | null | undefined): PaymentStatus {
  if (code === 0) return "paid";
  if (code === 1032) return "cancelled";
  return "failed";
}

// Safaricon TransactionDate arrives as YYYYMMDDHHmmss (EAT, UTC+3).
// Convert it to an ISO timestamp; return null if it cannot be parsed.
function parseTransactionDate(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).padStart(14, "0");
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(digits);
  if (!m) return null;
  const [, Y, Mo, D, H, Mi, S] = m;
  // M-PESA transaction times are in East Africa Time (UTC+3).
  const eatIso = `${Y}-${Mo}-${D}T${H}:${Mi}:${S}+03:00`;
  const d = new Date(eatIso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Mask a phone number for logs: keep the country code and last 3 digits.
function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const s = String(phone);
  if (s.length <= 6) return s.replace(/\d/g, "*");
  return `${s.slice(0, 4)}*****${s.slice(-3)}`;
}

export const Route = createFileRoute("/api/public/mpesa-callback")({
  server: {
    handlers: {
      // Preflight — Safaricom calls server-to-server, but keep CORS permissive
      // so manual browser testing (curl/Postman from the console) also works.
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS_HEADERS }),

      // Convenience health check. Safaricom never GETs this, but a GET makes
      // it easy to verify the URL is live from a browser.
      GET: async () =>
        Response.json(
          { received: true, service: "mpesa-callback", method: "GET" },
          { headers: CORS_HEADERS },
        ),

      // The actual STK Push callback.
      POST: async ({ request }) => {
        const raw = await request.text();
        const contentType = request.headers.get("content-type") ?? "";

        let parsed: unknown = null;
        try {
          if (raw) {
            parsed = contentType.includes("application/json")
              ? JSON.parse(raw)
              : raw;
          }
        } catch (err) {
          console.error("[mpesa-callback] JSON parse error:", err, {
            raw: raw.slice(0, 2000),
          });
        }

        // Safaricom wraps the callback as { Body: { stkCallback: { ... } } }.
        const body = (parsed as { Body?: unknown } | null)?.Body;
        const stk =
          (body as { stkCallback?: Record<string, unknown> } | null)?.stkCallback ?? null;

        if (!stk) {
          console.warn("[mpesa-callback] no stkCallback in payload", {
            body: parsed ?? raw,
          });
          // Still acknowledge so Safaricom stops retrying.
          return Response.json({ received: true }, { headers: CORS_HEADERS });
        }

        const merchantRequestID = (stk.MerchantRequestID as string) ?? null;
        const checkoutRequestID = (stk.CheckoutRequestID as string) ?? null;
        const resultCodeRaw = stk.ResultCode;
        const resultCode =
          typeof resultCodeRaw === "number"
            ? resultCodeRaw
            : typeof resultCodeRaw === "string"
              ? Number(resultCodeRaw)
              : null;
        const resultDesc = (stk.ResultDesc as string) ?? null;

        // CallbackMetadata is only present for successful transactions.
        // Safaricom shape: { CallbackMetadata: { Item: [ { Name, Value }, ... ] } }
        const metaObj = stk.CallbackMetadata as
          | { Item?: { Name?: string; Value?: unknown }[] }
          | null
          | undefined;
        const metaArr = metaObj?.Item;
        const meta = new Map<string, unknown>();
        if (Array.isArray(metaArr)) {
          for (const item of metaArr) {
            if (item && typeof item === "object" && "Name" in item) {
              meta.set(String(item.Name), item.Value);
            }
          }
        }

        const amount = meta.has("Amount")
          ? Number(meta.get("Amount"))
          : null;
        const receipt = (meta.get("MpesaReceiptNumber") as string) ?? null;
        const transactionDate = parseTransactionDate(meta.get("TransactionDate"));
        const phoneNumber = (meta.get("PhoneNumber") as string) ?? null;

        const paymentStatus: PaymentStatus = statusForResultCode(resultCode);

        console.log("[mpesa-callback] parsed callback", {
          merchantRequestID,
          checkoutRequestID,
          resultCode,
          resultDesc,
          paymentStatus,
          amount,
          receipt,
          transactionDate,
          phone: maskPhone(phoneNumber),
        });

        // Persist / upsert into the private mpesa_payments table using the
        // service-role backend client. RLS is bypassed for service_role, so
        // this is the only role allowed to write here (no anon/authenticated
        // INSERT policy exists). Dedup on CheckoutRequestID.
        try {
          const url = process.env["SUPABASE_URL"]!;
          const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
          if (!url || !serviceKey) {
            throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
          }

          const supabaseAdmin = createClient<Database>(url, serviceKey, {
            auth: {
              storage: undefined,
              persistSession: false,
              autoRefreshToken: false,
            },
            // Opaque sb_secret_ keys are not JWTs; send only `apikey` and strip
            // the default `Authorization: Bearer <key>` header so PostgREST does
            // not try to JWT-parse it ("Expected 3 parts in JWT; got 1").
            global: {
              fetch: (input, init) => {
                const headers = new Headers(init?.headers);
                if (
                  serviceKey.startsWith("sb_") &&
                  headers.get("Authorization") === `Bearer ${serviceKey}`
                ) {
                  headers.delete("Authorization");
                }
                headers.set("apikey", serviceKey);
                return fetch(input, { ...init, headers });
              },
            },
          });

          const row = {
            merchant_request_id: merchantRequestID,
            checkout_request_id: checkoutRequestID,
            mpesa_receipt_number: receipt,
            phone_number: phoneNumber,
            amount: Number.isFinite(amount) ? amount : null,
            result_code: resultCode,
            result_description: resultDesc,
            transaction_date: transactionDate,
            payment_status: paymentStatus,
          };

          // Upsert keyed on checkout_request_id so retried/duplicate callbacks
          // from Safaricom update the same row instead of creating duplicates.
          const { error } = await supabaseAdmin
            .from("mpesa_payments")
            .upsert(row, {
              onConflict: "checkout_request_id",
              ignoreDuplicates: false,
            });

          if (error) {
            console.error("[mpesa-callback] failed to persist payment", {
              checkoutRequestID,
              resultCode,
              paymentStatus,
              error: error.message,
            });
          } else {
            console.log("[mpesa-callback] payment persisted", {
              checkoutRequestID,
              paymentStatus,
              receipt,
            });
          }
        } catch (err) {
          // Never let a DB error change the response to Safaricom — it would
          // trigger endless retries. Log and still acknowledge 200.
          console.error("[mpesa-callback] persistence error", err);
        }

        // Always return 200 to Safaricom so it stops retrying.
        return Response.json({ received: true }, { headers: CORS_HEADERS });
      },
    },
  },
});
