import { supabase } from "@/integrations/supabase/client";

const KEY = "me_ref_code";

export const setReferralCode = (code: string) => {
  try { localStorage.setItem(KEY, code.toUpperCase()); } catch {}
};
export const getReferralCode = (): string | null => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
export const clearReferralCode = () => {
  try { localStorage.removeItem(KEY); } catch {}
};

export type ReferralAgent = { id: string; full_name: string; referral_code: string };

export async function lookupAgent(code: string | null): Promise<ReferralAgent | null> {
  if (!code) return null;
  const { data } = await supabase
    .from("agents_public" as never)
    .select("id, full_name, referral_code")
    .eq("referral_code", code.toUpperCase())
    .maybeSingle();
  return (data as ReferralAgent | null) ?? null;
}

export async function getCommissionRule(): Promise<{ type: "percent" | "fixed"; value: number }> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "commission")
    .maybeSingle();
  const v = (data as { value?: { type?: string; value?: number } } | null)?.value;
  if (v && (v.type === "percent" || v.type === "fixed") && typeof v.value === "number") {
    return { type: v.type, value: v.value };
  }
  return { type: "percent", value: 5 };
}

export function computeCommission(
  rule: { type: "percent" | "fixed"; value: number },
  items: { qty: number; subtotal: number; basePrice?: number; discountAllowed?: number; product?: { basePrice?: number; discountAllowed?: number; price?: number; originalPrice?: number } }[],
  _total: number,
): number {
  if (rule.type === "percent") {
    // Agent commission = 40% of Meridian Express revenue.
    // Revenue per item = (selling price - original supplier price) * qty.
    const revenue = items.reduce((sum, i) => {
      const selling = i.product?.price;
      const original = i.product?.originalPrice;
      if (typeof selling === "number" && typeof original === "number" && selling > original) {
        return sum + Math.round((selling - original) * i.qty);
      }
      // Fallback: legacy business-product margin (basePrice + discountAllowed%)
      const base = i.basePrice ?? i.product?.basePrice;
      const disc = i.discountAllowed ?? i.product?.discountAllowed;
      if (base && disc) return sum + Math.round(base * (disc / 100) * i.qty);
      return sum;
    }, 0);
    return Math.round(revenue * 0.4);
  }
  const units = items.reduce((a, i) => a + i.qty, 0);
  return Math.round(rule.value * units);
}