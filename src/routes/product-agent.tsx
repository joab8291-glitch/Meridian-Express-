import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, LogOut, Package, Store, PlusCircle, ClipboardList, Activity, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  getMyPIA, listMySubmissions, listMySuppliers, insertSubmission, insertSupplier,
  updateSubmissionStatus, logActivity,
  submissionBadgeClass, SUBMISSION_STATUS_LABEL, PIA_STATUS_LABEL,
  type PIA, type Submission, type Supplier,
  listMyCommissions, COMMISSION_STATUS_LABEL, commissionBadgeClass,
  type PIACommission,
} from "@/lib/pia";
import { CATEGORIES, INDUSTRIAL_SUBCATEGORIES } from "@/lib/products";

const SUBCATEGORY_SUGGESTIONS: Record<string, string[]> = {
  "clothing": ["Men's Clothing", "Women's Clothing", "Children's Clothing", "Uniforms", "Workwear", "Shoes", "Fashion Accessories"],
  "urban-gardening-products": ["Planting Containers", "Seedlings and Seeds", "Gardening Tools", "Watering Equipment", "Vertical Gardening Products", "Soil and Growing Media", "Fertilizers", "Greenhouse Products"],
  "refrigeration-products": ["Commercial Refrigerators", "Display Refrigerators", "Freezers", "Cold Rooms", "Ice Makers", "Beverage Coolers", "Refrigeration Accessories", "Refrigeration Spare Parts"],
  "bedding-and-bed-products": ["Bedsheets", "Duvets", "Duvet Covers", "Pillows", "Pillowcases", "Blankets", "Comforters", "Mattress Protectors", "Bed Covers", "Mattresses", "Bed Frames"],
  "industrial-products": [...INDUSTRIAL_SUBCATEGORIES],
};

export const Route = createFileRoute("/product-agent")({
  head: () => ({ meta: [{ title: "Product Introduction Agent Dashboard — Meridian Express" }] }),
  component: Dashboard,
});

type Tab = "overview" | "submit" | "submissions" | "suppliers" | "commissions";

function Dashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pia, setPIA] = useState<PIA | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [commissions, setCommissions] = useState<PIACommission[]>([]);
  const [tab, setTab] = useState<Tab>("overview");

  const refresh = async () => {
    const p = await getMyPIA();
    setPIA(p);
    if (p) {
      const [s, sup, cm] = await Promise.all([listMySubmissions(p.id), listMySuppliers(p.id), listMyCommissions(p.id)]);
      setSubs(s); setSuppliers(sup); setCommissions(cm);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav({ to: "/product-agent-login" }); return; }
      await refresh();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => { await supabase.auth.signOut(); nav({ to: "/" }); };

  const counts = useMemo(() => ({
    drafts: subs.filter(s => s.status === "draft").length,
    submitted: subs.filter(s => ["submitted","under_review","resubmitted"].includes(s.status)).length,
    changes: subs.filter(s => s.status === "changes_requested").length,
    approved: subs.filter(s => s.status === "approved").length,
    live: subs.filter(s => s.status === "live").length,
    rejected: subs.filter(s => s.status === "rejected").length,
  }), [subs]);

  if (loading) return <div className="mx-auto max-w-3xl px-5 py-20 text-center text-muted-foreground">Loading…</div>;
  if (!pia) return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p>No Product Introduction Agent profile found for this account.</p>
      <Link to="/join-as-product-agent" className="mt-4 inline-block text-primary hover:underline">Apply to become an agent</Link>
    </div>
  );
  if (pia.status !== "active") return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="font-display text-2xl">{PIA_STATUS_LABEL[pia.status]}</h1>
      <p className="mt-3 text-muted-foreground">
        {pia.status === "pending"
          ? "Your application is under review. You'll be notified once approved."
          : "Please contact Meridian Express for more information."}
      </p>
      <Button onClick={logout} variant="outline" className="mt-6"><LogOut className="h-4 w-4 mr-2" />Logout</Button>
    </div>
  );

  const copyCode = () => { if (pia.agent_code) { navigator.clipboard.writeText(pia.agent_code); toast.success("Agent code copied"); } };

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Product Introduction Agent</span>
          <h1 className="font-display text-3xl md:text-4xl">Welcome, {pia.full_name.split(" ")[0]}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">Active</span>
            {pia.agent_code && (
              <button onClick={copyCode} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs hover:bg-secondary/70">
                <span className="font-mono">{pia.agent_code}</span><Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Logout</Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Drafts" value={counts.drafts} />
        <Stat label="Submitted" value={counts.submitted} />
        <Stat label="Changes" value={counts.changes} accent={counts.changes > 0} />
        <Stat label="Approved" value={counts.approved} />
        <Stat label="Live" value={counts.live} />
        <Stat label="Rejected" value={counts.rejected} />
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
        {([
          { id: "overview", label: "Overview", icon: Activity },
          { id: "submit", label: "Submit Product", icon: PlusCircle },
          { id: "submissions", label: "My Submissions", icon: ClipboardList },
          { id: "suppliers", label: "Suppliers", icon: Store },
          { id: "commissions", label: "Commissions", icon: Wallet },
        ] as { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && <Overview subs={subs} />}
        {tab === "submit" && <SubmitForm pia={pia} suppliers={suppliers} onSaved={refresh} />}
        {tab === "submissions" && <SubmissionsTab subs={subs} onChange={refresh} />}
        {tab === "suppliers" && <SuppliersTab pia={pia} suppliers={suppliers} onChange={refresh} />}
        {tab === "commissions" && <CommissionsTab commissions={commissions} />}
      </div>
    </div>
  );
}

function maskPhone(p: string | null): string {
  if (!p) return "—";
  const s = p.replace(/\s+/g, "");
  if (s.length < 6) return "***";
  return s.slice(0, 4) + "***" + s.slice(-2);
}

function ksh(n: number) { return `KSh ${Math.round(n || 0).toLocaleString("en-KE")}`; }

function CommissionsTab({ commissions }: { commissions: PIACommission[] }) {
  const totals = useMemo(() => {
    const t = { pending: 0, confirmed: 0, approved: 0, paid: 0, month: 0, sales: 0 };
    const now = new Date();
    for (const c of commissions) {
      if (c.commission_status === "pending") t.pending += Number(c.commission_amount);
      if (c.commission_status === "confirmed") t.confirmed += Number(c.commission_amount);
      if (c.commission_status === "approved") t.approved += Number(c.commission_amount);
      if (c.commission_status === "paid") {
        t.paid += Number(c.commission_amount);
        const d = c.paid_at ? new Date(c.paid_at) : null;
        if (d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) t.month += Number(c.commission_amount);
      }
      if (["confirmed","approved","paid"].includes(c.commission_status)) t.sales += 1;
    }
    return t;
  }, [commissions]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm">Your commission rate is <span className="font-semibold text-primary">1%</span> of the final selling price of each product you introduced, per unit sold.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs uppercase tracking-wider text-muted-foreground">Pending</div><div className="mt-1 text-lg font-semibold">{ksh(totals.pending)}</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs uppercase tracking-wider text-muted-foreground">Confirmed</div><div className="mt-1 text-lg font-semibold">{ksh(totals.confirmed)}</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs uppercase tracking-wider text-muted-foreground">Approved for Payment</div><div className="mt-1 text-lg font-semibold">{ksh(totals.approved)}</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs uppercase tracking-wider text-muted-foreground">Paid (all-time)</div><div className="mt-1 text-lg font-semibold">{ksh(totals.paid)}</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs uppercase tracking-wider text-muted-foreground">Paid this month</div><div className="mt-1 text-lg font-semibold">{ksh(totals.month)}</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs uppercase tracking-wider text-muted-foreground">Products sold</div><div className="mt-1 text-lg font-semibold">{totals.sales}</div></div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left">Order</th>
                <th className="px-3 py-3 text-left">Product</th>
                <th className="px-3 py-3 text-right">Unit</th>
                <th className="px-3 py-3 text-right">Qty</th>
                <th className="px-3 py-3 text-right">Line Value</th>
                <th className="px-3 py-3 text-right">Rate</th>
                <th className="px-3 py-3 text-right">Commission</th>
                <th className="px-3 py-3 text-left">Order Date</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Paid</th>
              </tr>
            </thead>
            <tbody>
              {commissions.length === 0 && <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">No commissions yet. Once an order containing a product you introduced is approved, you'll see it here.</td></tr>}
              {commissions.map(c => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-3 font-mono text-[10px]">{c.order_id.slice(0, 8)}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{c.product_name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.customer_name || "Customer"} • {maskPhone(c.customer_phone)}</div>
                  </td>
                  <td className="px-3 py-3 text-right">{ksh(Number(c.unit_price))}</td>
                  <td className="px-3 py-3 text-right">{c.quantity}</td>
                  <td className="px-3 py-3 text-right">{ksh(Number(c.line_value))}</td>
                  <td className="px-3 py-3 text-right">1%</td>
                  <td className="px-3 py-3 text-right font-semibold">{ksh(Number(c.commission_amount))}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs">{c.order_date ? new Date(c.order_date).toLocaleDateString() : "—"}</td>
                  <td className="px-3 py-3"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${commissionBadgeClass(c.commission_status)}`}>{COMMISSION_STATUS_LABEL[c.commission_status]}</span></td>
                  <td className="px-3 py-3 text-xs">{c.paid_at ? new Date(c.paid_at).toLocaleDateString() : "—"}{c.payment_reference ? <div className="text-[10px] text-muted-foreground">Ref: {c.payment_reference}</div> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Overview({ subs }: { subs: Submission[] }) {
  const recent = subs.slice(0, 8);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="font-semibold">Recent Submissions</h2>
        <p className="text-xs text-muted-foreground">Your last 8 product submissions.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Status</th></tr>
          </thead>
          <tbody>
            {recent.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">No submissions yet. Head to "Submit Product" to add your first.</td></tr>}
            {recent.map(s => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.category || "—"}</td>
                <td className="px-4 py-3">{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${submissionBadgeClass(s.status)}`}>{SUBMISSION_STATUS_LABEL[s.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubmitForm({ pia, suppliers, onSaved }: { pia: PIA; suppliers: Supplier[]; onSaved: () => void }) {
  const [supplierId, setSupplierId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: "", category: "", subcategory: "", description: "", specifications: "",
    supplier_price: "", proposed_selling_price: "", stock: "", stock_status: "in_stock",
    min_order_qty: "1", delivery_available: false, delivery_locations: "",
    warranty: "", condition: "new", brand: "", model: "",
    main_image: "", images: "",
    agent_notes: "",
    confirm_supplier: false, confirm_accurate: false, confirm_terms: false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(s => ({ ...s, [k]: v }));

  const save = async (status: "draft" | "submitted") => {
    if (!f.name.trim()) return toast.error("Product name is required");
    if (status === "submitted") {
      if (!supplierId) return toast.error("Select or create a supplier first");
      if (!f.confirm_supplier || !f.confirm_accurate || !f.confirm_terms) return toast.error("Please tick all confirmations before submitting");
    }
    setSaving(true);
    try {
      const imgs = f.images.split("\n").map(s => s.trim()).filter(Boolean);
      const row = {
        agent_id: pia.id, agent_code: pia.agent_code,
        supplier_introduction_id: supplierId || null,
        name: f.name, category: f.category || null, subcategory: f.subcategory || null,
        description: f.description || null, specifications: f.specifications || null,
        supplier_price: f.supplier_price ? Number(f.supplier_price) : null,
        proposed_selling_price: f.proposed_selling_price ? Number(f.proposed_selling_price) : null,
        stock: f.stock ? Number(f.stock) : 0,
        stock_status: f.stock_status,
        min_order_qty: f.min_order_qty ? Number(f.min_order_qty) : 1,
        delivery_available: f.delivery_available,
        delivery_locations: f.delivery_locations || null,
        warranty: f.warranty || null, condition: f.condition,
        brand: f.brand || null, model: f.model || null,
        main_image: f.main_image || null, images: imgs,
        agent_notes: f.agent_notes || null,
        status,
      };
      const { data, error } = await insertSubmission(row);
      if (error) throw error;
      const rec = data as { id: string } | null;
      if (rec) await logActivity({ action: status === "draft" ? "draft_created" : "submitted", submission_id: rec.id, agent_id: pia.id });
      toast.success(status === "draft" ? "Draft saved" : "Submitted for review");
      setF(s => ({ ...s, name: "", description: "", specifications: "", supplier_price: "", proposed_selling_price: "", stock: "", main_image: "", images: "", agent_notes: "", confirm_supplier: false, confirm_accurate: false, confirm_terms: false }));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <SupplierPicker pia={pia} suppliers={suppliers} value={supplierId} onChange={setSupplierId} onRefresh={onSaved} />
      </div>
      <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Product details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <F label="Product name *" value={f.name} onChange={(v) => set("name", v)} required />
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Category</span>
            <select
              value={f.category}
              onChange={(e) => set("category", e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm"
            >
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Subcategory</span>
            <input
              list={`subcat-${f.category || "none"}`}
              value={f.subcategory}
              onChange={(e) => set("subcategory", e.target.value)}
              placeholder={SUBCATEGORY_SUGGESTIONS[f.category]?.[0] ?? "e.g. Workwear"}
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm"
            />
            {SUBCATEGORY_SUGGESTIONS[f.category] && (
              <datalist id={`subcat-${f.category}`}>
                {SUBCATEGORY_SUGGESTIONS[f.category].map((s) => <option key={s} value={s} />)}
              </datalist>
            )}
          </label>
          <F label="Brand" value={f.brand} onChange={(v) => set("brand", v)} />
          <F label="Model" value={f.model} onChange={(v) => set("model", v)} />
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Condition</span>
            <select value={f.condition} onChange={(e) => set("condition", e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm">
              <option value="new">New</option>
              <option value="refurbished">Refurbished</option>
              <option value="used">Used</option>
            </select>
          </label>
          <F label="Supplier price (KSh)" type="number" value={f.supplier_price} onChange={(v) => set("supplier_price", v)} />
          <F label="Proposed selling price (KSh)" type="number" value={f.proposed_selling_price} onChange={(v) => set("proposed_selling_price", v)} />
          <F label="Stock qty" type="number" value={f.stock} onChange={(v) => set("stock", v)} />
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Stock status</span>
            <select value={f.stock_status} onChange={(e) => set("stock_status", e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm">
              <option value="in_stock">In stock</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="preorder">Pre-order</option>
            </select>
          </label>
          <F label="Min order qty" type="number" value={f.min_order_qty} onChange={(v) => set("min_order_qty", v)} />
          <F label="Warranty" value={f.warranty} onChange={(v) => set("warranty", v)} />
          <label className="flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" checked={f.delivery_available} onChange={(e) => set("delivery_available", e.target.checked)} />
            <span>Delivery available</span>
          </label>
          <F label="Delivery locations" value={f.delivery_locations} onChange={(v) => set("delivery_locations", v)} />
        </div>
        <div className="mt-4 grid gap-4">
          <TA label="Short description" value={f.description} onChange={(v) => set("description", v)} rows={3} />
          <TA label="Specifications" value={f.specifications} onChange={(v) => set("specifications", v)} rows={3} />
          <F label="Main image URL" value={f.main_image} onChange={(v) => set("main_image", v)} />
          <TA label="Additional image URLs (one per line)" value={f.images} onChange={(v) => set("images", v)} rows={3} />
          <TA label="Agent notes for admin" value={f.agent_notes} onChange={(v) => set("agent_notes", v)} rows={2} />
        </div>

        <div className="mt-6 space-y-2 rounded-xl border border-border bg-secondary/30 p-4 text-sm">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={f.confirm_supplier} onChange={(e) => set("confirm_supplier", e.target.checked)} className="mt-1" />
            <span>I confirm the supplier information is accurate and verified.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={f.confirm_accurate} onChange={(e) => set("confirm_accurate", e.target.checked)} className="mt-1" />
            <span>I confirm the product details, pricing, and specifications are accurate.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={f.confirm_terms} onChange={(e) => set("confirm_terms", e.target.checked)} className="mt-1" />
            <span>I understand this submission will be reviewed by Meridian Express before going live.</span>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => save("draft")} disabled={saving}>Save as Draft</Button>
          <Button onClick={() => save("submitted")} disabled={saving}>{saving ? "Saving…" : "Submit for Review"}</Button>
        </div>
      </div>
    </div>
  );
}

function SupplierPicker({ pia, suppliers, value, onChange, onRefresh }: {
  pia: PIA; suppliers: Supplier[]; value: string; onChange: (id: string) => void; onRefresh: () => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState({ name: "", contact_person: "", phone: "", email: "", county: "", town: "", address: "" });
  const save = async () => {
    if (!s.name.trim() || !s.phone.trim()) return toast.error("Supplier name and phone required");
    setSaving(true);
    try {
      const { data, error } = await insertSupplier({ ...s, agent_id: pia.id, agent_code: pia.agent_code, status: "new" });
      if (error) throw error;
      const rec = data as { id: string } | null;
      if (rec) { onChange(rec.id); await logActivity({ action: "supplier_added", supplier_id: rec.id, agent_id: pia.id }); }
      toast.success("Supplier added");
      setShowNew(false);
      setS({ name: "", contact_person: "", phone: "", email: "", county: "", town: "", address: "" });
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-6 sticky top-4">
      <h2 className="font-semibold flex items-center gap-2"><Store className="h-4 w-4" /> Supplier</h2>
      <p className="text-xs text-muted-foreground mt-1">Link this product to the supplier you're introducing.</p>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-4 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm">
        <option value="">— Select supplier —</option>
        {suppliers.map(sp => <option key={sp.id} value={sp.id}>{sp.name} · {sp.phone}</option>)}
      </select>
      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowNew(v => !v)}>
        {showNew ? "Cancel" : "+ Add new supplier"}
      </Button>
      {showNew && (
        <div className="mt-3 space-y-3">
          <F label="Supplier name *" value={s.name} onChange={(v) => setS(x => ({ ...x, name: v }))} />
          <F label="Contact person" value={s.contact_person} onChange={(v) => setS(x => ({ ...x, contact_person: v }))} />
          <F label="Phone *" value={s.phone} onChange={(v) => setS(x => ({ ...x, phone: v }))} />
          <F label="Email" value={s.email} onChange={(v) => setS(x => ({ ...x, email: v }))} />
          <F label="County" value={s.county} onChange={(v) => setS(x => ({ ...x, county: v }))} />
          <F label="Town" value={s.town} onChange={(v) => setS(x => ({ ...x, town: v }))} />
          <F label="Address" value={s.address} onChange={(v) => setS(x => ({ ...x, address: v }))} />
          <Button size="sm" onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save supplier"}</Button>
        </div>
      )}
    </div>
  );
}

function SubmissionsTab({ subs, onChange }: { subs: Submission[]; onChange: () => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const filtered = subs.filter(s =>
    (filter === "all" || s.status === filter) &&
    (!q || s.name.toLowerCase().includes(q.toLowerCase()))
  );
  const resubmit = async (s: Submission) => {
    const { error } = await updateSubmissionStatus(s.id, { status: "resubmitted" });
    if (error) return toast.error(error.message);
    await logActivity({ action: "resubmitted", submission_id: s.id, agent_id: s.agent_id });
    toast.success("Resubmitted for review"); onChange();
  };
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-5 border-b border-border flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="font-semibold">My Submissions</h2>
          <p className="text-xs text-muted-foreground">Filter, search and manage your product submissions.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-border bg-secondary px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            {Object.entries(SUBMISSION_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)}
            className="rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-right">Selling Price</th><th className="px-4 py-3 text-left">Updated</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No submissions match.</td></tr>}
            {filtered.map(s => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.category || "—"}</td>
                <td className="px-4 py-3 text-right">{s.proposed_selling_price ? `KSh ${Number(s.proposed_selling_price).toLocaleString("en-KE")}` : "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(s.updated_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${submissionBadgeClass(s.status)}`}>{SUBMISSION_STATUS_LABEL[s.status]}</span>
                  {s.status === "changes_requested" && s.admin_notes && (
                    <div className="mt-1 text-[11px] text-destructive">{s.admin_notes}</div>
                  )}
                  {s.status === "rejected" && s.rejection_reason && (
                    <div className="mt-1 text-[11px] text-destructive">{s.rejection_reason}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.status === "changes_requested" && (
                    <Button size="sm" variant="outline" onClick={() => resubmit(s)}>Resubmit</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuppliersTab({ pia, suppliers, onChange }: { pia: PIA; suppliers: Supplier[]; onChange: () => void }) {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState({ name: "", contact_person: "", phone: "", email: "", county: "", town: "", address: "" });
  const save = async () => {
    if (!s.name || !s.phone) return toast.error("Name and phone required");
    setSaving(true);
    try {
      const { data, error } = await insertSupplier({ ...s, agent_id: pia.id, agent_code: pia.agent_code, status: "new" });
      if (error) throw error;
      const rec = data as { id: string } | null;
      if (rec) await logActivity({ action: "supplier_added", supplier_id: rec.id, agent_id: pia.id });
      toast.success("Supplier added");
      setShow(false);
      setS({ name: "", contact_person: "", phone: "", email: "", county: "", town: "", address: "" });
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  };
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Add supplier</h2>
          <Button size="sm" variant="outline" onClick={() => setShow(v => !v)}>{show ? "Close" : "+ New"}</Button>
        </div>
        {show && (
          <div className="mt-4 space-y-3">
            <F label="Supplier name *" value={s.name} onChange={(v) => setS(x => ({ ...x, name: v }))} />
            <F label="Contact person" value={s.contact_person} onChange={(v) => setS(x => ({ ...x, contact_person: v }))} />
            <F label="Phone *" value={s.phone} onChange={(v) => setS(x => ({ ...x, phone: v }))} />
            <F label="Email" value={s.email} onChange={(v) => setS(x => ({ ...x, email: v }))} />
            <F label="County" value={s.county} onChange={(v) => setS(x => ({ ...x, county: v }))} />
            <F label="Town" value={s.town} onChange={(v) => setS(x => ({ ...x, town: v }))} />
            <F label="Address" value={s.address} onChange={(v) => setS(x => ({ ...x, address: v }))} />
            <Button size="sm" onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
          </div>
        )}
      </div>
      <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">Suppliers introduced</h2>
          <p className="text-xs text-muted-foreground">{suppliers.length} supplier{suppliers.length === 1 ? "" : "s"}.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Phone</th><th className="px-4 py-3 text-left">Location</th><th className="px-4 py-3 text-left">Status</th></tr>
            </thead>
            <tbody>
              {suppliers.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">No suppliers yet.</td></tr>}
              {suppliers.map(sp => (
                <tr key={sp.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{sp.name}<div className="text-xs text-muted-foreground">{sp.contact_person}</div></td>
                  <td className="px-4 py-3">{sp.phone}</td>
                  <td className="px-4 py-3">{[sp.county, sp.town].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3"><span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{sp.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function F({ label, type = "text", value, onChange, required }: { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}
function TA({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}