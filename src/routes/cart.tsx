import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { formatKES } from "@/lib/products";
import { useCart, useAuth, ensureSupabaseSession } from "@/lib/store";
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
  head: () => ({ meta: [{ title: "Cart — Meridian Express" }, { name: "description", content: "Review your cart and place your order." }] }),
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
  const [showGuestModal, setShowGuestModal] = useState(false);

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

  const buildItems = () => detailed.map(({ product, qty, subtotal }) => ({
    id: product.id, name: product.name, qty, price: product.price, subtotal,
  }));

  /** Save the order straight to the admin dashboard (sales_orders) — no WhatsApp/email redirect. */
  const placeOrder = async (opts: {
    customerName: string | null;
    phone: string | null;
    email: string | null;
    accountType: string;
    userId?: string | null;
    referralCode?: string | null;
    agentName?: string | null;
  }) => {
    logCartOrders(detailed, { name: opts.customerName ?? undefined, phone: opts.phone ?? undefined });
    const { error } = await supabase.from("sales_orders").insert({
      customer_name: opts.customerName,
      customer_phone: opts.phone,
      customer_email: opts.email,
      account_type: opts.accountType,
      items: buildItems(),
      total,
      referral_code: opts.referralCode ?? null,
      agent_id: agent?.id ?? null,
      agent_name: opts.agentName ?? null,
      commission_amount: commission,
      order_type: "non-whatsapp",
      tracking_status: "order_received",
      user_id: opts.userId ?? null,
    } as never);
    return error;
  };

  const onPlaceOrderClick = () => {
    if (user) {
      submitForUser();
    } else {
      setShowGuestModal(true);
    }
  };

  const submitForUser = async () => {
    if (!user) return;
    setPlacing(true);
    try {
      const uid = await ensureSupabaseSession(user.email);
      const error = await placeOrder({
        customerName: user.name ?? null,
        phone: user.phone ?? null,
        email: user.email,
        accountType: user.accountType,
        userId: uid,
        referralCode: agent?.referral_code ?? null,
        agentName: agent?.full_name ?? null,
      });
      if (error) throw error;
      toast.success("Order placed! Track its progress in My Orders.");
      clear();
      nav({ to: "/my-orders" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally { setPlacing(false); }
  };

  const onGuestConfirm = async ({ phone, name, referralAgent, referralCode }: { phone: string; name: string; referralCode: string | null; referralAgent: { name: string; phone: string; code: string } | null }) => {
    setShowGuestModal(false);
    setPlacing(true);
    try {
      const effectiveCode = referralAgent?.code ?? agent?.referral_code ?? referralCode ?? null;
      const effectiveAgentName = referralAgent?.name ?? agent?.full_name ?? null;
      const error = await placeOrder({
        customerName: name || null,
        phone,
        email: null,
        accountType: "guest",
        referralCode: effectiveCode,
        agentName: effectiveAgentName,
      });
      if (error) throw error;
      toast.success("Order placed! We'll contact you shortly to confirm.");
      clear();
      nav({ to: "/shop" });
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
          <div className="mt-1 flex justify-between text-sm"><span className="text-muted-foreground">Delivery</span><span className="font-medium">Confirmed after order review</span></div>
          <div className="mt-3 border-t border-border pt-3 flex justify-between"><span className="font-semibold">Total</span><span className="text-lg font-bold text-primary">{formatKES(total)}</span></div>
          <Button
            type="button"
            disabled={placing}
            onClick={onPlaceOrderClick}
            className="mt-5 w-full rounded-xl py-6 text-base font-semibold"
          >
            <Package className="h-5 w-5" /> {placing ? "Placing order…" : "Place Order"}
          </Button>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            {user
              ? "Your order goes straight to our team, and you can track it in My Orders."
              : "We'll ask for your name and phone number so our team can confirm your order."}
          </p>
          <Link to="/shop" className="mt-3 block text-center text-sm text-muted-foreground hover:text-primary">Continue shopping</Link>
        </aside>
      </div>
      <PhoneCaptureModal
        open={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onConfirm={onGuestConfirm}
        confirmLabel="Place Order"
        defaultReferralCode={refInput}
      />
    </div>
  );
}
