import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, LogOut, Wallet, Store, Package, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatKES } from "@/lib/products";

export const Route = createFileRoute("/pi")({
  head: () => ({ meta: [{ title: "Product Introducer Dashboard — Meridian Express" }] }),
  component: PIDashboard,
});

type PI = {
  id: string; full_name: string; email: string; phone: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  referral_code: string | null; mpesa_number: string | null;
};
type Business = { id: string; business_name: string; phone: string; county: string; location: string; created_at: string; status: string; pi_referral_code: string | null };
type Commission = { id: string; order_id: string; product_name: string | null; sale_amount: number; rate: number; commission_amount: number; status: string; payment_reference: string | null; paid_at: string | null; created_at: string; business_id: string | null };

function PIDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pi, setPI] = useState<PI | null>(null);
  const [suppliers, setSuppliers] = useState<Business[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/pi-login" }); return; }
      const { data: p } = await supabase.from("product_introducers").select("*").eq("id", user.id).maybeSingle();
      setPI(p as PI | null);
      if (p && (p as PI).status === "approved") {
        const [{ data: b }, { data: c }] = await Promise.all([
          supabase.from("businesses").select("id,business_name,phone,county,location,created_at,status,pi_referral_code").eq("product_introducer_id", user.id).order("created_at", { ascending: false }),
          supabase.from("pi_commissions").select("*").eq("product_introducer_id", user.id).order("created_at", { ascending: false }),
        ]);
        setSuppliers((b as unknown as Business[]) || []);
        setCommissions((c as unknown as Commission[]) || []);
      }
      setLoading(false);
    })();
  }, [nav]);

  const logout = async () => { await supabase.auth.signOut(); nav({ to: "/" }); };

  const stats = useMemo(() => {
    const pending = commissions.filter(c => c.status === "confirmed").reduce((a, c) => a + Number(c.commission_amount), 0);
    const payable = commissions.filter(c => c.status === "payable").reduce((a, c) => a + Number(c.commission_amount), 0);
    const paid = commissions.filter(c => c.status === "paid").reduce((a, c) => a + Number(c.commission_amount), 0);
    const qualifying = commissions.filter(c => c.status !== "cancelled").reduce((a, c) => a + Number(c.sale_amount), 0);
    return { pending, payable, paid, qualifying, balance: pending + payable };
  }, [commissions]);

  if (loading) return <div className="mx-auto max-w-3xl px-5 py-20 text-center text-muted-foreground">Loading…</div>;
  if (!pi) return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p>No Product Introducer profile found for this account.</p>
      <Link to="/join-as-introducer" className="mt-4 inline-block text-primary hover:underline">Apply to become a Product Introducer</Link>
    </div>
  );
  if (pi.status !== "approved") return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="font-display text-2xl">{pi.status === "pending" ? "Application Pending" : pi.status === "rejected" ? "Application Not Approved" : "Account Suspended"}</h1>
      <p className="mt-3 text-muted-foreground">
        {pi.status === "pending" ? "Your application is still under review." : "Please contact Meridian Express for more information."}
      </p>
      <Button onClick={logout} variant="outline" className="mt-6"><LogOut className="h-4 w-4 mr-2" />Logout</Button>
    </div>
  );

  const refLink = `${typeof window !== "undefined" ? window.location.origin : ""}/auth?ref=${pi.referral_code}`;
  const copy = () => { navigator.clipboard.writeText(refLink); toast.success("Referral link copied"); };
  const copyCode = () => { if (pi.referral_code) { navigator.clipboard.writeText(pi.referral_code); toast.success("Referral code copied"); } };

  const filteredCommissions = commissions.filter(c => !q || (c.product_name || "").toLowerCase().includes(q.toLowerCase()) || c.order_id.includes(q));

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Product Introducer</span>
          <h1 className="font-display text-3xl md:text-4xl">Welcome, {pi.full_name.split(" ")[0]}</h1>
          <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">Status: Approved</span>
        </div>
        <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Logout</Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Your Referral Code</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-2xl text-primary">{pi.referral_code}</span>
            <button onClick={copyCode} className="text-muted-foreground hover:text-primary"><Copy className="h-4 w-4" /></button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Share this code with suppliers when they register their business.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Supplier Signup Link</span>
          <div className="mt-2 flex gap-2">
            <input readOnly value={refLink} className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-xs" />
            <Button onClick={copy} size="sm"><Copy className="h-4 w-4 mr-1" />Copy</Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Store} label="Suppliers Introduced" value={suppliers.length.toString()} />
        <Stat icon={Package} label="Qualifying Sales" value={formatKES(stats.qualifying)} />
        <Stat icon={Clock} label="Pending Commission" value={formatKES(stats.pending + stats.payable)} />
        <Stat icon={Wallet} label="Paid Commission" value={formatKES(stats.paid)} accent />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold">Introduced Suppliers</h2>
            <p className="text-xs text-muted-foreground">Businesses linked to your referral code.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3 text-left">Business</th><th className="px-4 py-3 text-left">Phone</th><th className="px-4 py-3 text-left">Location</th><th className="px-4 py-3 text-left">Joined</th><th className="px-4 py-3 text-left">Status</th></tr>
            </thead>
            <tbody>
              {suppliers.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No suppliers yet. Share your code to start earning.</td></tr>}
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{s.business_name}</td>
                  <td className="px-4 py-3">{s.phone}</td>
                  <td className="px-4 py-3">{[s.county, s.location].filter(Boolean).join(", ")}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Badge>{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold">Commission History</h2>
            <p className="text-xs text-muted-foreground">1% of qualifying product sales.</p>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product or order id…"
            className="rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-right">Sale</th><th className="px-4 py-3 text-right">Rate</th><th className="px-4 py-3 text-right">Commission</th><th className="px-4 py-3 text-left">Status</th></tr>
            </thead>
            <tbody>
              {filteredCommissions.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No commissions yet.</td></tr>}
              {filteredCommissions.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{c.product_name || "—"}</td>
                  <td className="px-4 py-3 text-right">{formatKES(Number(c.sale_amount))}</td>
                  <td className="px-4 py-3 text-right">{(Number(c.rate) * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">{formatKES(Number(c.commission_amount))}</td>
                  <td className="px-4 py-3"><Badge variant={c.status === "paid" ? "primary" : "muted"}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

function Badge({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "muted" }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${variant === "muted" ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>{children}</span>;
}

// unused import silencer
void CheckCircle2;