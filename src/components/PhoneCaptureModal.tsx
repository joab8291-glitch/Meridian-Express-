import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Validate/normalize Kenyan mobile numbers.
 *  Accepts: 07XXXXXXXX, 01XXXXXXXX, +2547/1XXXXXXXX, 2547/1XXXXXXXX.
 *  Returns a canonical +2547XXXXXXXX / +2541XXXXXXXX string, or null. */
export function normalizeKePhone(raw: string): string | null {
  const s = (raw || "").replace(/[^\d+]/g, "");
  let d = s.startsWith("+") ? s.slice(1) : s;
  if (/^0[71]\d{8}$/.test(d)) d = "254" + d.slice(1);
  if (/^[71]\d{8}$/.test(d)) d = "254" + d;
  if (!/^254[71]\d{8}$/.test(d)) return null;
  return "+" + d;
}

export type ReferralAgentInfo = { id: string; name: string; phone: string; code: string };
export type PhoneCaptureValue = { phone: string; name: string; referralCode: string | null; referralAgent: ReferralAgentInfo | null };

async function lookupReferralAgentByCode(code: string): Promise<ReferralAgentInfo | null> {
  const upper = code.trim().toUpperCase();
  if (!upper) return null;
  // Try referral_agents via secure single-code lookup (phone is not readable
  // directly by anon — only returned for the exact entered, active code).
  const { data: ra } = await supabase
    .rpc("lookup_referral_agent", { _code: upper })
    .maybeSingle();
  const r = ra as { id: string; name: string; phone: string; code: string } | null;
  if (r) return { id: r.id, name: r.name, phone: r.phone, code: r.code };
  // Fallback: existing implementer agents (approved)
  const { data: ag } = await supabase
    .from("agents_public" as never)
    .select("id,full_name,referral_code,phone")
    .eq("referral_code", upper)
    .maybeSingle();
  const a = ag as { id: string; full_name: string; referral_code: string; phone?: string } | null;
  if (a) return { id: a.id, name: a.full_name, phone: a.phone ?? "", code: a.referral_code };
  return null;
}

export function PhoneCaptureModal({
  open,
  onClose,
  onConfirm,
  title = "Add Your Number to Continue",
  subtitle = "Please enter your phone number so Meridian Express can contact you about your order.",
  confirmLabel = "Continue",
  defaultName = "",
  defaultPhone = "",
  defaultReferralCode = "",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (v: PhoneCaptureValue) => void;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  defaultName?: string;
  defaultPhone?: string;
  defaultReferralCode?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [ref, setRef] = useState(defaultReferralCode);
  const [refState, setRefState] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [refAgent, setRefAgent] = useState<ReferralAgentInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(defaultName); setPhone(defaultPhone); setErr(null);
      setRef(defaultReferralCode); setRefState("idle"); setRefAgent(null);
      if (defaultReferralCode) { void checkRef(defaultReferralCode); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultName, defaultPhone, defaultReferralCode]);

  const checkRef = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) { setRefState("idle"); setRefAgent(null); return; }
    setRefState("checking");
    const a = await lookupReferralAgentByCode(trimmed);
    if (a) { setRefAgent(a); setRefState("valid"); }
    else { setRefAgent(null); setRefState("invalid"); }
  };

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { setErr("Please enter your phone number before placing an order."); return; }
    const normalized = normalizeKePhone(phone);
    if (!normalized) { setErr("Enter a valid Kenyan number e.g. 0712345678 or +254712345678."); return; }
    // Ensure referral code (if any) is looked up before we return
    let agent = refAgent;
    const trimmedRef = ref.trim();
    if (trimmedRef && refState !== "valid") {
      agent = await lookupReferralAgentByCode(trimmedRef);
    }
    onConfirm({
      phone: normalized,
      name: name.trim(),
      referralCode: trimmedRef ? trimmedRef.toUpperCase() : null,
      referralAgent: agent,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-background shadow-hover border border-border p-5 animate-slide-up"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl leading-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:bg-secondary text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Phone Number <span className="text-destructive">*</span></label>
            <input
              type="tel"
              inputMode="tel"
              autoFocus
              required
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setErr(null); }}
              placeholder="07XX XXX XXX or +2547XX XXX XXX"
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Name <span className="text-muted-foreground/70">(optional)</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Referral Code <span className="text-muted-foreground/70">(optional)</span></label>
            <input
              type="text"
              value={ref}
              onChange={(e) => { setRef(e.target.value); setRefState("idle"); setRefAgent(null); }}
              onBlur={(e) => checkRef(e.target.value)}
              placeholder="Enter referral code"
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/30"
            />
            {refState === "checking" && <p className="mt-1 text-[11px] text-muted-foreground">Checking…</p>}
            {refState === "valid" && refAgent && (
              <p className="mt-1 text-[11px]" style={{ color: "oklch(0.55 0.15 150)" }}>Referred by {refAgent.name}</p>
            )}
            {refState === "invalid" && (
              <p className="mt-1 text-[11px] text-destructive">Referral code not found. Please check the code or continue without it.</p>
            )}
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>

        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
          <button type="submit" className="rounded-full px-5 py-2 text-sm font-semibold text-white shadow-hover hover:opacity-90" style={{ background: "oklch(0.62 0.17 150)" }}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}