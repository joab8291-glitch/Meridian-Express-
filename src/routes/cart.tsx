import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, FileText, Mail } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { formatKES } from "@/lib/products";
import { useCart, useAuth, WHATSAPP_NUMBER, ensureSupabaseSession, mailtoOrderLink } from "@/lib/store";
import { logCartOrders } from "@/lib/business";
import {
  getReferralCode,
  lookupAgent,
  getCommissionRule,
  computeCommission,
  type ReferralAgent,
} from "@/lib/referral";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PhoneCaptureModal } from "@/components/PhoneCaptureModal";
import { WhatsAppChannelCTA } from "@/components/WhatsAppChannelCTA";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — Meridian Express" }, { name: "description", content: "Review your cart and checkout via WhatsApp." }] }),
  component: CartPage,
});

function CartPage() {
  const { detailed, total, setQty, remove, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [agent, setAgent] = useState<ReferralAgent | null>(null);
  const [rule, setRule] = useState<{ type: "percent" | "fixed"; value: number }>({ type: "percent", value: 5 });
  const [refInput, setRefInput] = useState<string>("");
  const [refStatus, setRefStatus] = useState<"idle" | "checking" | "invalid">("idle");
  const [placing, setPlacing] = useState(false);
  const [orderChannel, setOrderChannel] = useState<"whatsapp" | "email" | null>(null);

  useEffect(() => {
    const stored = getReferralCode();
    if (stored) {
      setRefInput(stored);
      lookupAgent(stored).then((a) => { setAgent(a); if (!a) setRefStatus("invalid"); });
    }
    getCommissionRule().then(setRule);
  }, []);

  const checkRef = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setAgent(null); setRefStatus("idle"); return; }
    setRefStatus("checking");
    const a = await lookupAgent(trimmed);
    setAgent(a);
    setRefStatus(a ? "idle" : "invalid");
  };

  const commission = agent
    ? computeCommission(
        rule,
        detailed.map((d) => ({
          qty: d.qty,
          subtotal: d.subtotal,
          basePrice: d.product.basePrice,
          discountAllowed: d.product.discountAllowed,
          product: d.product,
        })),
        total,
      )
    : 0;

  const buildMessage = (phone: string, customerName?: string | null, code?: string | null, agentName?: string | null, agentPhone?: string | null, channel: "whatsapp" | "email" = "whatsapp") => {
    const lines = detailed.map((i) => `• ${i.product.name} x${i.qty} — ${formatKES(i.subtotal)}`);
    const refBlock = code
      ? `Referral Code: ${code}\nReferred By: ${agentName ?? "-"}\nAgent Phone Number: ${agentPhone ?? "-"}\n`
      : "";
    return `Hello Meridian Express,\n\n` +
      `I would like to continue with my order.\n\n` +
      `Customer Name: ${customerName ?? "-"}\n` +
      `Customer Phone: ${phone}\n` +
      refBlock +
      `\nOrder Details:\n${lines.join("\n")}\n\nTotal: ${formatKES(total)}\nOrder Type: ${channel === "email" ? "Email Order" : "WhatsApp Order"}\n\n` +
      `Please send me the availability and next steps.`;
  };

  const buildItems = () => detailed.map(({ product, qty, subtotal }) => ({
    id: product.id, name: product.name, qty, price: product.price, subtotal,
  }));

  const onOrderClick = (channel: "whatsapp" | "email") => () => setOrderChannel(channel);
  const onOrderConfirm = ({ phone, name, referralAgent }: { phone: string; name: string; referralCode: string | null; referralAgent: { name: string; phone: string; code: string } | null }) => {
    const channel = orderChannel ?? "whatsapp";
    setOrderChannel(null);
    const customerName = name || user?.name || null;
    logCartOrders(detailed, { name: customerName ?? undefined, phone });
    const effectiveCode = referralAgent?.code ?? agent?.referral_code ?? null;
    const effectiveAgentName = referralAgent?.name ?? agent?.full_name ?? null;
    const effectiveAgentPhone = referralAgent?.phone ?? null;
    supabase.from("sales_orders").insert({
      customer_name: customerName,
      customer_phone: phone,
      customer_email: user?.email ?? null,
      account_type: user?.accountType ?? "guest",
      items: buildItems(), total,
      referral_code: effectiveCode,
      agent_id: agent?.id ?? null,
      agent_name: effectiveAgentName,
      commission_amount: commission,
      order_type: channel,
      tracking_status: "order_received",
    } as never).then(() => {}, () => {});
    const msg = buildMessage(phone, customerName, effectiveCode, effectiveAgentName, effectiveAgentPhone, channel);
    if (channel === "email") {
      window.location.href = mailtoOrderLink("Order from Meridian Express Cart", msg);
    } else {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    }
  };

  const onNonWhatsAppCheckout = async () => {
    if (!user) {
      toast.message("Please create an account or log in to place and track a non-WhatsApp order.");
      nav({ to: "/auth" });
      return;
    }
    setPlacing(true);
    try {
      const uid = await ensureSupabaseSession(user.email);
      logCartOrders(detailed, { name: user.name, phone: user.phone });
      const { error } = await supabase.from("sales_orders").insert({
        customer_name: user.name ?? null,
        customer_phone: user.phone ?? null,
        customer_email: user.email,
        account_type: user.accountType,
        items: buildItems(),
        total,
        referral_code: agent?.referral_code ?? null,
        agent_id: agent?.id ?? null,
        agent_name: agent?.full_name ?? null,
        commission_amount: commission,
        order_type: "non-whatsapp",
        tracking_status: "order_received",
        user_id: uid ?? null,
      } as never);
      if (error) throw error;
      toast.success("Order placed! Track its progress in My Orders.");
      clear();
      nav({ to: "/my-orders" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally { setPlacing(false); }
  };

  if (detailed.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center animate-fade-in">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary"><ShoppingBag className="h-7 w-7 text-muted-foreground" /></div>
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse our products and add items to your cart.</p>
        <Button asChild className="mt-6"><Link to="/shop">Continue Shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHeader eyebrow="Your Cart" title="Review & Checkout" />
      <div className="mb-6">
        <WhatsAppChannelCTA variant="inline" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {detailed.map(({ product, qty, subtotal }) => (
            <li key={product.id} className="flex gap-4 rounded-2xl border border-border bg-card p-3 shadow-card animate-slide-up">
              <img src={product.image} alt={product.name} className="h-24 w-24 rounded-xl object-cover" />
              <div className="flex flex-1 flex-col">
                <Link to="/product/$id" params={{ id: product.id }} className="font-semibold hover:text-primary">{product.name}</Link>
                <span className="text-xs text-muted-foreground capitalize">{product.category.replace(/-/g, " ")}</span>
                <div className="mt-auto flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full border border-border">
                    <button onClick={() => setQty(product.id, qty - 1)} className="p-1.5"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center text-sm font-medium">{qty}</span>
                    <button onClick={() => setQty(product.id, qty + 1)} className="p-1.5"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <span className="font-bold text-primary">{formatKES(subtotal)}</span>
                </div>
              </div>
              <button onClick={() => remove(product.id)} className="self-start p-2 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-card h-fit lg:sticky lg:top-32">
          <h3 className="text-lg font-semibold">Order Summary</h3>
          <div className="mt-3">
            <label className="block text-xs font-medium text-muted-foreground">Referral Code (Optional)</label>
            <input
              value={refInput}
              onChange={(e) => { setRefInput(e.target.value); setRefStatus("idle"); }}
              onBlur={(e) => checkRef(e.target.value)}
              placeholder="Enter agent referral code if you have one"
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/30"
            />
            {refStatus === "checking" && <p className="mt-1 text-[11px] text-muted-foreground">Checking…</p>}
            {refStatus === "invalid" && <p className="mt-1 text-[11px] text-destructive">Referral code not found. You can continue without a referral code.</p>}
          </div>
          {agent && (
            <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs">
              Referred by <span className="font-semibold">{agent.full_name}</span>
              <span className="ml-1 text-muted-foreground">({agent.referral_code})</span>
            </div>
          )}
          <div className="mt-4 flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatKES(total)}</span></div>
          <div className="mt-1 flex justify-between text-sm"><span className="text-muted-foreground">Delivery</span><span className="font-medium">Confirmed on WhatsApp</span></div>
          <div className="mt-3 border-t border-border pt-3 flex justify-between"><span className="font-semibold">Total</span><span className="text-lg font-bold text-primary">{formatKES(total)}</span></div>
          <button
            type="button"
            onClick={onOrderClick("whatsapp")}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-base font-semibold text-white shadow-hover transition hover:opacity-90"
            style={{ background: "oklch(0.62 0.17 150)" }}
          >
            <WhatsAppIcon className="h-5 w-5" /> Order with WhatsApp
          </button>
          <button
            type="button"
            onClick={onOrderClick("email")}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-base font-semibold text-white shadow-hover transition hover:opacity-90"
            style={{ background: "var(--navy)" }}
          >
            <Mail className="h-5 w-5" /> Order by Email
          </button>
          <Button
            type="button"
            variant="outline"
            disabled={placing}
            onClick={onNonWhatsAppCheckout}
            className="mt-3 w-full rounded-xl"
          >
            <FileText className="h-4 w-4" /> {placing ? "Placing order…" : "Non-WhatsApp Order"}
          </Button>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            Use this option if you want to track your order through your account.
          </p>
          <Link to="/shop" className="mt-3 block text-center text-sm text-muted-foreground hover:text-primary">Continue shopping</Link>
        </aside>
      </div>
      <PhoneCaptureModal
        open={orderChannel !== null}
        onClose={() => setOrderChannel(null)}
        onConfirm={onOrderConfirm}
        confirmLabel={orderChannel === "email" ? "Continue to Email" : "Continue to WhatsApp"}
        defaultName={user?.name ?? ""}
        defaultPhone={user?.phone ?? ""}
        defaultReferralCode={refInput}
      />
    </div>
  );
}
