import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, LogOut, Wallet, Package, TrendingUp, Clock, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatKES } from "@/lib/products";
import { waLink } from "@/lib/store";

export const Route = createFileRoute("/agent")({
  head: () => ({ meta: [{ title: "Implementer Dashboard — Meridian Express" }] }),
  component: ImplementerDashboard,
});

type Implementer = {
  id: string; full_name: string; email: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  referral_code: string | null;
};
type Order = {
  id: string; created_at: string; customer_name: string | null; customer_phone: string | null;
  items: { name: string; qty: number }[]; total: number; commission_amount: number | null;
  status: string; commission_status: string | null;
  assigned_agent_id: string | null;
  implementation_status: string | null;
  assignment_notes: string | null;
  customer_county: string | null; customer_town: string | null; customer_area: string | null;
};
type Notif = { id: string; title: string; body: string | null; created_at: string; read_at: string | null; link: string | null };

const IMPL_STATUSES: { value: string; label: string; requiresNote?: boolean }[] = [
  { value: "assigned", label: "Assigned" },
  { value: "customer_contacted", label: "Customer Contacted" },
  { value: "visit_scheduled", label: "Visit Scheduled" },
  { value: "quotation_sent", label: "Quotation Sent" },
  { value: "awaiting_customer_confirmation", label: "Awaiting Customer Confirmation", requiresNote: true },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "completed", label: "Completed" },
  { value: "unable_to_complete", label: "Unable to Complete", requiresNote: true },
  { value: "cancelled", label: "Cancelled", requiresNote: true },
];
const labelOf = (s: string | null) => IMPL_STATUSES.find((x) => x.value === s)?.label ?? "Unassigned";

function ImplementerDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Implementer | null>(null);
  const [refOrders, setRefOrders] = useState<Order[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notif[]>([]);

  const refresh = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { nav({ to: "/agent-login" }); return; }
    const { data: a } = await supabase.from("agents").select("*").eq("id", user.id).maybeSingle();
    setMe(a as Implementer | null);
    if (a && (a as Implementer).status === "approved") {
      const [r1, r2, r3] = await Promise.all([
        supabase.from("sales_orders").select("*").eq("agent_id", user.id).order("created_at", { ascending: false }),
        supabase.from("sales_orders").select("*").eq("assigned_agent_id", user.id).order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setRefOrders((r1.data as unknown as Order[]) || []);
      setAssignedOrders((r2.data as unknown as Order[]) || []);
      setNotifications((r3.data as unknown as Notif[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const logout = async () => { await supabase.auth.signOut(); nav({ to: "/" }); };

  if (loading) return <div className="mx-auto max-w-3xl px-5 py-20 text-center text-muted-foreground">Loading…</div>;
  if (!me) return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p>No implementer profile found for this account.</p>
      <Link to="/join-our-team" className="mt-4 inline-block text-primary hover:underline">Apply to become an implementer</Link>
    </div>
  );
  if (me.status === "pending") return <StatusCard title="Application Under Review" body="Your implementer account is currently under review. You will be notified once your account has been approved. Commission and payment details will be shared with you at that time." onLogout={logout} />;
  if (me.status === "rejected") return <StatusCard title="Application Not Approved" body="Your implementer application was not approved. Please contact Meridian Express for more information." onLogout={logout} />;
  if (me.status === "suspended") return <StatusCard title="Account Suspended" body="Your implementer account has been suspended. Please contact Meridian Express to reactivate it." onLogout={logout} />;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const refLink = `${origin}/ref/${me.referral_code}`;
  const totalSales = refOrders.reduce((a, o) => a + Number(o.total), 0);
  const totalCommission = refOrders.reduce((a, o) => a + Number(o.commission_amount || 0), 0);
  const pendingCommission = refOrders.filter((o) => o.commission_status !== "paid" && o.status !== "cancelled").reduce((a, o) => a + Number(o.commission_amount || 0), 0);
  const paidCommission = refOrders.filter((o) => o.commission_status === "paid").reduce((a, o) => a + Number(o.commission_amount || 0), 0);
  const activeAssigned = assignedOrders.filter((o) => !["completed", "cancelled", "unable_to_complete"].includes(o.implementation_status || ""));
  const copy = () => { navigator.clipboard.writeText(refLink); toast.success("Referral link copied"); };
  const unread = notifications.filter((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Implementer Dashboard</span>
          <h1 className="font-display text-3xl md:text-4xl">Welcome, {me.full_name.split(" ")[0]}</h1>
          <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">Status: Approved</span>
        </div>
        <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Logout</Button>
      </div>

      {unread.length > 0 && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">Notifications ({unread.length} new)</div>
          <ul className="space-y-1 text-sm">
            {unread.slice(0, 5).map((n) => (
              <li key={n.id}>• <b>{n.title}</b>{n.body ? ` — ${n.body}` : ""}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Your Referral Code</span>
          <div className="mt-1 font-display text-2xl text-primary">{me.referral_code}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Your Referral Link</span>
          <div className="mt-2 flex gap-2">
            <input readOnly value={refLink} className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-xs" />
            <Button onClick={copy} size="sm"><Copy className="h-4 w-4 mr-1" />Copy</Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Package} label="Assigned Orders" value={assignedOrders.length.toString()} />
        <Stat icon={TrendingUp} label="Active Assignments" value={activeAssigned.length.toString()} />
        <Stat icon={Wallet} label="Referral Sales" value={formatKES(totalSales)} />
        <Stat icon={Clock} label="Pending Commission" value={formatKES(pendingCommission)} />
        <Stat icon={Wallet} label="Paid Commission" value={formatKES(paidCommission)} accent />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">Assigned Orders</h2>
          <p className="text-xs text-muted-foreground">Orders you have been assigned to implement. Update the status as work progresses.</p>
        </div>
        <div className="divide-y divide-border">
          {assignedOrders.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">No assigned orders yet.</div>}
          {assignedOrders.map((o) => <AssignedOrderRow key={o.id} order={o} onChange={refresh} />)}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">Referred Orders & Commissions</h2>
          <p className="text-xs text-muted-foreground">Only orders approved by Meridian Express admin appear here. Total confirmed commission: {formatKES(totalCommission)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Products</th><th className="px-4 py-3 text-right">Order</th><th className="px-4 py-3 text-right">Commission</th><th className="px-4 py-3 text-left">Status</th></tr>
            </thead>
            <tbody>
              {refOrders.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No referred orders yet. Share your link to start earning!</td></tr>}
              {refOrders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{o.customer_name || "Guest"}<div className="text-xs text-muted-foreground">{o.customer_phone}</div></td>
                  <td className="px-4 py-3">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatKES(Number(o.total))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">{formatKES(Number(o.commission_amount || 0))}</td>
                  <td className="px-4 py-3"><Pill>{o.status}</Pill> <Pill variant="muted">{o.commission_status ?? "pending"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AssignedOrderRow({ order, onChange }: { order: Order; onChange: () => void }) {
  const [openUpdate, setOpenUpdate] = useState(false);
  const [status, setStatus] = useState(order.implementation_status || "assigned");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const cust = order.customer_name || "Guest";
  const phone = order.customer_phone || "";
  const location = [order.customer_area, order.customer_town, order.customer_county].filter(Boolean).join(", ");
  const waMsg = `Hello, I am the Meridian Express implementer assigned to assist you with order #${order.id.slice(0, 8)}. When would be a good time to discuss the details?`;

  const submit = async () => {
    const cfg = IMPL_STATUSES.find((s) => s.value === status);
    if (cfg?.requiresNote && !notes.trim()) return toast.error("Please add an explanation for this status.");
    setSaving(true);
    const { error } = await supabase.rpc("update_implementation_status", {
      _order_id: order.id, _new_status: status as never, _notes: notes || undefined,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    setOpenUpdate(false); setNotes("");
    onChange();
  };

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Order #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString()}</div>
          <div className="font-semibold">{cust}</div>
          {phone && <div className="text-xs text-muted-foreground">{phone}</div>}
          {location && <div className="text-xs text-muted-foreground">{location}</div>}
          <div className="mt-1 text-xs">{order.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</div>
          <div className="mt-1 text-sm font-medium">{formatKES(Number(order.total))}</div>
          {order.assignment_notes && <div className="mt-2 text-xs rounded-md bg-secondary p-2"><b>Admin notes:</b> {order.assignment_notes}</div>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">{labelOf(order.implementation_status)}</span>
          <div className="flex flex-wrap gap-2 justify-end">
            {phone && <a href={`tel:${phone}`} className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs"><Phone className="h-3.5 w-3.5" />Call</a>}
            {phone && <a href={waLink(waMsg)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-[oklch(0.62_0.17_150)] text-white px-2.5 py-1.5 text-xs"><WhatsAppIcon className="h-3.5 w-3.5" />WhatsApp</a>}
            <Button size="sm" onClick={() => setOpenUpdate((v) => !v)}>{openUpdate ? "Cancel" : "Update Status"}</Button>
          </div>
        </div>
      </div>
      {openUpdate && (
        <div className="mt-4 grid gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-[1fr_auto]">
          <div className="grid gap-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">New Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
                {IMPL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}{s.requiresNote ? " (explanation required)" : ""}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Progress notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" placeholder="Optional notes for this update…" />
            </label>
          </div>
          <div className="flex items-end">
            <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save Update"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border p-5 ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <Icon className="h-5 w-5 opacity-70" />
      <div className="mt-3 text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
function Pill({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "muted" }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${variant === "muted" ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>{children}</span>;
}
function StatusCard({ title, body, onLogout }: { title: string; body: string; onLogout: () => void }) {
  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="font-display text-2xl">{title}</h1>
      <p className="mt-3 text-muted-foreground">{body}</p>
      <Button onClick={onLogout} variant="outline" className="mt-6"><LogOut className="h-4 w-4 mr-2" />Logout</Button>
    </div>
  );
}
