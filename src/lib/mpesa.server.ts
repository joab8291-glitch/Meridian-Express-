// Server-only M-PESA Daraja (sandbox) STK Push helpers.
//
// All credentials are read from backend secrets inside this module, which is
// blocked from client bundles by the `*.server.ts` filename convention.
// The Consumer Secret, Passkey and OAuth access token are NEVER logged or
// returned to the browser.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const OAUTH_URL =
  "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const STK_PUSH_URL =
  "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
const CALLBACK_URL = "https://meridianexpress.co.ke/api/public/mpesa-callback";

export type InitiateInput = {
  phone_number: string;
  amount: number;
  account_reference?: string;
  transaction_description?: string;
};

export type InitiateResult = {
  success: boolean;
  message: string;
  merchant_request_id?: string | null;
  checkout_request_id?: string | null;
  response_code?: string | null;
  response_description?: string | null;
  customer_message?: string | null;
};

/** Normalize 07XXXXXXXX / +2547XXXXXXXX / 2547XXXXXXXX / 7XXXXXXXX -> 2547XXXXXXXX */
export function normalizeKenyanPhone(raw: string): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  let msisdn: string | null = null;
  if (/^254[17]\d{8}$/.test(digits)) msisdn = digits;
  else if (/^0[17]\d{8}$/.test(digits)) msisdn = `254${digits.slice(1)}`;
  else if (/^[17]\d{8}$/.test(digits)) msisdn = `254${digits}`;
  return msisdn;
}

/** YYYYMMDDHHmmss in East Africa Time (UTC+3), as Daraja requires. */
export function mpesaTimestamp(now: Date = new Date()): string {
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${eat.getUTCFullYear()}${p(eat.getUTCMonth() + 1)}${p(eat.getUTCDate())}` +
    `${p(eat.getUTCHours())}${p(eat.getUTCMinutes())}${p(eat.getUTCSeconds())}`
  );
}

function maskPhone(phone: string): string {
  return phone.length <= 6
    ? phone.replace(/\d/g, "*")
    : `${phone.slice(0, 4)}*****${phone.slice(-3)}`;
}

function adminClient() {
  const url = process.env["SUPABASE_URL"]!;
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(url, serviceKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
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
}

/** Safaricom OAuth access token (Basic auth with consumer key/secret). */
async function getAccessToken(key: string, secret: string): Promise<string> {
  const basic = btoa(`${key}:${secret}`);
  const res = await fetch(OAUTH_URL, {
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) {
    // Never echo credentials — only the status.
    throw new Error(`Safaricom OAuth failed with status ${res.status}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Safaricom OAuth returned no token");
  return json.access_token;
}

export async function initiateStkPush(
  input: InitiateInput,
): Promise<InitiateResult> {
  const consumerKey = process.env["MPESA_CONSUMER_KEY"];
  const consumerSecret = process.env["MPESA_CONSUMER_SECRET"];
  const passkey = process.env["MPESA_PASSKEY"];
  const shortcode = process.env["MPESA_SHORTCODE"];
  if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
    return { success: false, message: "M-PESA is not configured on the server." };
  }

  const phone = normalizeKenyanPhone(input.phone_number);
  if (!phone) {
    return { success: false, message: "Enter a valid Safaricom number (07XXXXXXXX)." };
  }

  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount < 1 || amount > 150000) {
    return { success: false, message: "Enter a valid amount between KSh 1 and KSh 150,000." };
  }

  const timestamp = mpesaTimestamp();
  const password = btoa(`${shortcode}${passkey}${timestamp}`);

  let token: string;
  try {
    token = await getAccessToken(consumerKey, consumerSecret);
  } catch (err) {
    console.error("[initiate-mpesa-payment] OAuth error:", (err as Error).message);
    return { success: false, message: "Could not authenticate with M-PESA. Try again." };
  }

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: CALLBACK_URL,
    AccountReference: (input.account_reference || "MeridianExpress").slice(0, 12),
    TransactionDesc: (input.transaction_description || "Payment").slice(0, 90),
  };

  let stk: Record<string, unknown>;
  try {
    const res = await fetch(STK_PUSH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    stk = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      console.error("[initiate-mpesa-payment] STK Push rejected", {
        status: res.status,
        body: stk,
      });
      return {
        success: false,
        message:
          (stk["errorMessage"] as string) ??
          `M-PESA rejected the request (status ${res.status}).`,
      };
    }
  } catch (err) {
    console.error("[initiate-mpesa-payment] STK Push error:", (err as Error).message);
    return { success: false, message: "Could not reach M-PESA. Try again." };
  }

  const merchantRequestId = (stk["MerchantRequestID"] as string) ?? null;
  const checkoutRequestId = (stk["CheckoutRequestID"] as string) ?? null;
  const responseCode = stk["ResponseCode"] != null ? String(stk["ResponseCode"]) : null;
  const responseDescription = (stk["ResponseDescription"] as string) ?? null;
  const customerMessage = (stk["CustomerMessage"] as string) ?? null;

  console.log("[initiate-mpesa-payment] STK Push accepted", {
    merchantRequestId,
    checkoutRequestId,
    responseCode,
    amount,
    phone: maskPhone(phone),
  });

  // Store / update a pending record, de-duplicated on checkout_request_id.
  if (checkoutRequestId) {
    try {
      const { error } = await adminClient()
        .from("mpesa_payments")
        .upsert(
          {
            merchant_request_id: merchantRequestId,
            checkout_request_id: checkoutRequestId,
            phone_number: phone,
            amount,
            result_description: responseDescription,
            payment_status: "pending" as const,
          },
          { onConflict: "checkout_request_id", ignoreDuplicates: false },
        );
      if (error) {
        console.error("[initiate-mpesa-payment] pending upsert failed", error.message);
      }
    } catch (err) {
      console.error("[initiate-mpesa-payment] pending upsert error", err);
    }
  }

  return {
    success: responseCode === "0",
    message: customerMessage ?? responseDescription ?? "STK Push sent.",
    merchant_request_id: merchantRequestId,
    checkout_request_id: checkoutRequestId,
    response_code: responseCode,
    response_description: responseDescription,
    customer_message: customerMessage,
  };
}