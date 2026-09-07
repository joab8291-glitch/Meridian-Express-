import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, RefreshCw, CheckCircle2, Truck, Warehouse, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth, ensureSupabaseSession } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/products";

export const Route = createFileRoute("/my-orders")({
  head: () => ({ meta: [{ title: "My Orders — Meridian Express" }] }),
  component: MyOrdersPage,
});

type MyOrder = {
  id: string;
  created_at: string;
  items: { name: string; qty: number; price: number; subtotal: number }[];
  total: number;
  order_type: string;
  tracking_status: string;
  status: string;
  payment_status: string;
};

const CUSTOMER_STAGES = [
  { key: "at_supplier", label: "At Supplier's Premise", icon: Warehouse,
    matches: ["at_supplier", "supplier_contacted", "confirmed", "order_received"] },
  { key: "on_route", label: "On Route", icon: Truck, matches: ["on_route"] },
  { key: "at_delivery_point", label: "At Delivery Point", icon: MapPin,
    matches: ["at_delivery_point", "delivered"] },
];

function stageIndex(tracking: string): number {
  if (tracking === "delivered" || tracking === "at_delivery_point") return 2;
  if (tracking === "on_route") return 1;
  return 0;
}

const STATUS_LABEL: Record<string, string> = {
  order_received: "Order Received",
  confirmed: "Confirmed by Meridian Express",
  supplier_contacted: "Supplier Contacted",
  at_supplier: "At Supplier's Premise",
  on_route: "On Route",
  at_delivery_point: "At Delivery Point",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function MyOrdersPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const uid = await ensureSupabaseSession(user.email);
    if (!uid) { setOrders([]); setLoading(false); return; }
    const { data } = await supabase
      .from("sales_orders")
      .select("id,created_at,items,total,order_type,tracking_status,status,payment_status")
      .eq("user_id", uid)
      .eq("order_type", "non-whatsapp")
      .order("created_at", { ascending: false });
    setOrders((data as unknown as MyOrder[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) { nav({ to: "/auth" }); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <SectionHeader eyebrow="My Account" title="My Non-WhatsApp Orders" subtitle="Track every order you have placed through your account." />
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>
      {loading ? (
        <p className="mt-10 text-center text-muted-foreground">Loading your orders…</p>
      ) : !orders || orders.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-semibold text-lg">No orders yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Place a Non-WhatsApp Order to track it here.</p>
          <Link to="/shop" className="mt-4 inline-block text-primary text-sm">Browse the shop →</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-5">
          {orders.map((o) => {
            const idx = stageIndex(o.tracking_status);
            return (
              <li key={o.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Order ID</div>
                    <div className="font-mono text-xs">{o.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                    <div className="text-lg font-bold text-primary">{formatKES(Number(o.total))}</div>
                  </div>
                </div>
                <ul className="mt-3 text-sm text-muted-foreground space-y-0.5">
                  {o.items.map((i, k) => (
                    <li key={k}>• {i.name} ×{i.qty} — {formatKES(Number(i.subtotal))}</li>
                  ))}
                </ul>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {CUSTOMER_STAGES.map((s, i) => {
                    const Icon = s.icon;
                    const active = i <= idx && o.tracking_status !== "cancelled";
                    return (
                      <div key={s.key} className={`rounded-xl border p-3 text-center transition ${active ? "border-primary bg-primary/5" : "border-border bg-secondary/40"}`}>
                        <Icon className={`mx-auto h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                        <div className={`mt-1 text-[11px] font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
                        {i === idx && active && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary"><CheckCircle2 className="h-3 w-3" /> Current</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Status: <span className="font-medium text-foreground">{STATUS_LABEL[o.tracking_status] || o.tracking_status}</span></span>
                  <span>Payment: <span className="font-medium text-foreground capitalize">{o.payment_status}</span></span>
                  <span>Type: <span className="font-medium text-foreground">Non-WhatsApp Order</span></span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}