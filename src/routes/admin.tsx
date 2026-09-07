import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { initiateMpesaPayment } from "@/lib/mpesa.functions";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Users, ShoppingBag, Wallet, CheckCircle2, XCircle, Clock, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatKES, getAllCatalogProducts, saveCatalogOverride, CATEGORIES, type Product } from "@/lib/products";
import type { BusinessProduct } from "@/lib/business";
import * as XLSX from "xlsx";
import { getCategoryMarkups, saveCategoryMarkup, effectiveIncreasePercent, isPriceExempt, DEFAULT_CATEGORY_MARKUPS } from "@/lib/pricing";
import { Plus, Pencil, Trash2, Download, Search } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Meridian Express" }] }),
  component: AdminRoute,
});

type Agent = {
  id: string; full_name: string; email: string; phone: string; county: string | null;
  area: string | null; social: string | null; id_number: string | null; reason: string | null;
  status: "pending" | "approved" | "rejected" | "suspended"; referral_code: string | null;
  applied_at: string;
};
type Order = {
  id: string; created_at: string; customer_name: string | null; customer_phone: string | null;
  customer_email: string | null; account_type: string | null;
  items: { name: string; qty: number; price: number }[]; total: number;
  referral_code: string | null; agent_name: string | null; commission_amount: number;
  status: string; payment_status: string; commission_status: string;
  admin_approved: boolean; approved_at: string | null;
  order_type?: string | null;
  tracking_status?: string | null;
  assigned_agent_id?: string | null;
  assigned_at?: string | null;
  assignment_notes?: string | null;
  implementation_status?: string | null;
  customer_county?: string | null;
  customer_town?: string | null;
  customer_area?: string | null;
};

function AdminRoute() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChecking(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      setChecking(false);
    })();
  }, []);

  if (checking) return <div className="mx-auto max-w-3xl px-5 py-20 text-center text-muted-foreground">Loading…</div>;
  return isAdmin ? <AdminDashboard /> : <AdminLogin onLogin={() => setIsAdmin(true)} />;
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user!.id, _role: "admin" });
      if (!ok) { await supabase.auth.signOut(); throw new Error("This account is not an admin."); }
      toast.success("Welcome, admin");
      onLogin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <SectionHeader eyebrow="Restricted" title="Admin Login" />
      <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
        <Button type="submit" disabled={loading}>{loading ? "Signing in…" : "Login"}</Button>
      </form>
    </div>
  );
}

type Tab = "overview" | "agents" | "assignments" | "orders" | "products" | "commissions" | "introducers" | "intro_agents" | "referrals" | "mpesa_test" | "settings";

function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalogTick, setCatalogTick] = useState(0);
  const catalogProducts = useMemo(() => getAllCatalogProducts(), [catalogTick]);

  const refresh = async () => {
    const [{ data: a }, { data: o }] = await Promise.all([
      supabase.from("agents").select("*").order("applied_at", { ascending: false }),
      supabase.from("sales_orders").select("*").order("created_at", { ascending: false }),
    ]);
    setAgents((a as unknown as Agent[]) || []);
    setOrders((o as unknown as Order[]) || []);
  };
  useEffect(() => { refresh(); }, []);

  const logout = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "agents", label: "Implementers" },
    { id: "assignments", label: "Assignments" },
    { id: "orders", label: "Orders" },
    { id: "products", label: "Products" },
    { id: "commissions", label: "Commissions" },
    { id: "introducers", label: "Product Introducers" },
    { id: "intro_agents", label: "Product Introduction Agents" },
    { id: "referrals", label: "Referral Agents" },
    { id: "mpesa_test", label: "M-PESA Sandbox Test" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Admin Portal</span>
          <h1 className="font-display text-3xl md:text-4xl">Meridian Express Control Center</h1>
        </div>
        <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Logout</Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && <Overview agents={agents} orders={orders} />}
        {tab === "agents" && <AgentsTab agents={agents} onChange={refresh} />}
        {tab === "assignments" && <AssignmentsTab orders={orders} onChange={refresh} />}
        {tab === "orders" && <OrdersTab orders={orders} onChange={refresh} />}
        {tab === "products" && <ProductsTab products={catalogProducts} onChange={() => setCatalogTick((v) => v + 1)} />}
        {tab === "commissions" && <CommissionsTab orders={orders} onChange={refresh} />}
        {tab === "introducers" && <IntroducersTab />}
        {tab === "intro_agents" && <IntroAgentsTab />}
        {tab === "referrals" && <ReferralAgentsTab orders={orders} />}
        {tab === "mpesa_test" && <MpesaSandboxTestTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

function ProductsTab({ products, onChange }: { products: Product[]; onChange: () => void }) {
  return <ProductsTabInner products={products} onChange={onChange} />;
}

function MpesaSandboxTestTab() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; merchant?: string | null; checkout?: string | null } | null>(null);
  const send = useServerFn(initiateMpesaPayment);

  const onSend = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await send({
        data: {
          phone_number: phone.trim(),
          amount: 1,
          account_reference: "ME-TEST-001",
          transaction_description: "Meridian Express Test",
        },
      });
      setResult({
        ok: !!res.success,
        message: res.success ? "STK Push sent successfully — check your phone." : res.message || "Safaricom rejected the request.",
        merchant: res.merchant_request_id,
        checkout: res.checkout_request_id,
      });
      if (res.success) toast.success("STK Push sent — check your phone");
      else toast.error(res.message || "STK Push failed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl">
      <SectionHeader eyebrow="Sandbox only" title="M-PESA Sandbox Test" subtitle="Temporary tool for testing STK Push. Does not affect checkout, orders or stock." />
      <div className="mt-5 rounded-xl border border-border p-5 space-y-4">
        <div>
          <label className="text-sm font-medium" htmlFor="mpesa-test-phone">M-PESA phone number</label>
          <input
            id="mpesa-test-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="07XXXXXXXX"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <Info label="Amount" value="KSh 1" />
          <Info label="Account Reference" value="ME-TEST-001" />
          <Info label="Description" value="Meridian Express Test" />
        </div>
        <Button onClick={onSend} disabled={busy || phone.trim().length < 9}>
          {busy ? "Sending…" : "Send Test STK Push"}
        </Button>

        {result && (
          <div className={`rounded-md border p-4 text-sm ${result.ok ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}>
            <p className="font-medium">{result.message}</p>
            {(result.merchant || result.checkout) && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground break-all">
                {result.merchant && <p>MerchantRequestID: {result.merchant}</p>}
                {result.checkout && <p>CheckoutRequestID: {result.checkout}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductsTabInner({ products, onChange }: { products: Product[]; onChange: () => void }) {
  return (
    <div className="space-y-4">
      <MarketingExport products={products} />
      <CategoryPricingPanel onChange={onChange} />
      <ProductPricingExport products={products} />
      <AddCategoryPanel />
      <AddProductPanel />
      <DbProductsManager />
      <BusinessUploadedProducts />
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Catalog Product Management</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Edit product name, price, image, category, description, condition, and stock status. Products stay in the existing order approval flow.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {products.map((product) => (
          <CatalogProductEditor key={product.id} product={product} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

function AddCategoryPanel() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  const autoSlug = (v: string) =>
    v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const submit = async () => {
    if (!name.trim()) return toast.error("Category name is required");
    const finalSlug = slug.trim() ? autoSlug(slug) : autoSlug(name);
    if (!finalSlug) return toast.error("Could not generate a valid slug — try a different name");
    setSaving(true);
    const { error } = await supabase
      .from("categories" as never)
      .insert({ name: name.trim(), slug: finalSlug, active: true } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Category "${name}" added`);
    setName(""); setSlug("");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Plus className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Add Category</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        New categories appear immediately in the shop sidebar and category browser, alongside the built-in ones.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Category Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Solar Equipment"
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Slug (optional — auto-generated if blank)</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="solar-equipment"
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm font-mono" />
        </label>
      </div>
      <div className="mt-4">
        <Button onClick={submit} disabled={saving}>{saving ? "Adding…" : "Add Category"}</Button>
      </div>
    </div>
  );
}

type DbCategoryOption = { id: string; slug: string; name: string };

function AddProductPanel() {
  const [categories, setCategories] = useState<DbCategoryOption[]>([]);
  const [form, setForm] = useState({
    title: "", price: "", categoryChoice: "", description: "", longDescription: "",
    availability: "In Stock" as "In Stock" | "Made to Order",
    county: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("categories" as never).select("id,slug,name").eq("active", true).order("sort_order");
      setCategories((data as unknown as DbCategoryOption[]) || []);
    })();
  }, []);

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Product name is required");
    const price = Number(form.price);
    if (!price || price <= 0) return toast.error("Enter a valid price");
    if (!file) return toast.error("Please choose a product photo");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { data: businessId, error: bizErr } = await supabase.rpc(
        "get_or_create_direct_business" as never,
        { _admin_id: user.id } as never,
      );
      if (bizErr) throw bizErr;

      const path = `admin/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("products").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const category = categories.find((c) => c.id === form.categoryChoice);

      const { data: product, error: prodErr } = await supabase
        .from("products" as never)
        .insert({
          title: form.title.trim(),
          price_kes: price,
          category_id: category?.id ?? null,
          description_short: form.description.trim() || null,
          description_long: form.longDescription.trim() || null,
          availability: form.availability,
          custom_made: form.availability === "Made to Order",
          county: form.county.trim() || null,
          business_id: businessId,
          status: "approved",
        } as never)
        .select("id")
        .single();
      if (prodErr) throw prodErr;

      const productId = (product as unknown as { id: string }).id;
      const { error: imgErr } = await supabase.from("product_images" as never).insert({
        product_id: productId, storage_path: path, is_primary: true, sort_order: 0,
      } as never);
      if (imgErr) throw imgErr;

      toast.success(`"${form.title}" added and live on the shop`);
      setForm({ title: "", price: "", categoryChoice: "", description: "", longDescription: "", availability: "In Stock", county: "" });
      setFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Plus className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Add Product</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Adds a product directly to the live catalog, under a "Meridian Express Direct Catalog" listing — separate from supplier-submitted products.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 block">
          <span className="text-xs font-medium text-muted-foreground">Product Name</span>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Price (KSh)</span>
          <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Category</span>
          <select value={form.categoryChoice} onChange={(e) => setForm({ ...form, categoryChoice: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
            <option value="">— Uncategorized —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2 block">
          <span className="text-xs font-medium text-muted-foreground">Product Photo</span>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Stock Status</span>
          <select value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value as "In Stock" | "Made to Order" })}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
            <option value="In Stock">In Stock</option>
            <option value="Made to Order">Made to Order</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">County</span>
          <input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="sm:col-span-2 block">
          <span className="text-xs font-medium text-muted-foreground">Short Description</span>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 min-h-[80px] w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="sm:col-span-2 block">
          <span className="text-xs font-medium text-muted-foreground">Full Description (optional)</span>
          <textarea value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
            className="mt-1 min-h-[80px] w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="mt-4">
        <Button onClick={submit} disabled={saving}>{saving ? "Adding…" : "Add Product"}</Button>
      </div>
    </div>
  );
}

type DbProductRow = {
  id: string; title: string; price_kes: number; status: string;
  county: string | null; created_at: string; category_id: string | null;
};

function DbProductsManager() {
  const [rows, setRows] = useState<DbProductRow[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [{ data: prods }, { data: cats }, { data: imgs }] = await Promise.all([
      supabase.from("products" as never)
        .select("id,title,price_kes,status,county,created_at,category_id")
        .in("status", ["approved", "archived"])
        .order("created_at", { ascending: false }),
      supabase.from("categories" as never).select("id,name"),
      supabase.from("product_images" as never).select("product_id,storage_path,is_primary"),
    ]);
    setRows((prods as unknown as DbProductRow[]) || []);
    const catMap: Record<string, string> = {};
    for (const c of (cats as unknown as { id: string; name: string }[]) || []) catMap[c.id] = c.name;
    setCategoryNames(catMap);
    const imgMap: Record<string, string> = {};
    for (const im of (imgs as unknown as { product_id: string; storage_path: string; is_primary: boolean }[]) || []) {
      if (!imgMap[im.product_id] || im.is_primary) {
        imgMap[im.product_id] = supabase.storage.from("products").getPublicUrl(im.storage_path).data.publicUrl;
      }
    }
    setImages(imgMap);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const toggleArchive = async (row: DbProductRow) => {
    setBusy(row.id);
    const nextStatus = row.status === "archived" ? "approved" : "archived";
    const { error } = await supabase.from("products" as never).update({ status: nextStatus } as never).eq("id", row.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(nextStatus === "archived" ? "Product removed from shop" : "Product restored — visible on shop again");
    refresh();
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading store-added products…</div>;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-semibold">Store-Added Products ({rows.length})</h2>
        <p className="mt-1 text-xs text-muted-foreground">Products added directly here, or via a published supplier submission. Removing hides a product from the shop without deleting its order history.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No store-added products yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {images[r.id] && <img src={images[r.id]} alt="" className="h-10 w-10 rounded-md object-cover bg-secondary" />}
                    <span className="font-medium">{r.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">{r.category_id ? categoryNames[r.category_id] || "—" : "Uncategorized"}</td>
                <td className="px-4 py-3 text-right">{formatKES(r.price_kes)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${r.status === "approved" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {r.status === "approved" ? "Live" : "Removed"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant={r.status === "archived" ? "default" : "outline"} disabled={busy === r.id} onClick={() => toggleArchive(r)}>
                    {busy === r.id ? "…" : r.status === "archived" ? "Restore" : "Remove"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SITE_DOMAIN = "https://www.meridianexpress.co.ke";

type ExportRow = {
  "Product Name": string;
  "Product Category": string;
  "Product Page Link": string;
  "Price": string;
  "Discount Allowed": string;
  "Final Display Price": string;
  "Size / Specifications": string;
  "Short Product Description": string;
  "Main Selling Point": string;
  "Stock Status": string;
  "Supplier Name": string;
  "Supplier Phone Number": string;
  "Business Location": string;
  "Product Image URL": string;
  "Additional Image URLs": string;
  "Marketing Priority": "High" | "Medium" | "Low";
};

function isPublicUrl(u?: string | null): boolean {
  if (!u) return false;
  return /^https?:\/\//i.test(u) && !u.startsWith("blob:") && !u.startsWith("data:");
}

function buildExportRows(catalog: Product[]): ExportRow[] {
  let biz: BusinessProduct[] = [];
  try { biz = JSON.parse(localStorage.getItem("me_biz_products") || "[]") as BusinessProduct[]; } catch { /* ignore */ }

  const catRows: ExportRow[] = catalog.map((p) => {
    const catName = CATEGORIES.find((c) => c.slug === p.category)?.name ?? p.category ?? "";
    const priceNum = p.price || 0;
    const priceStr = priceNum > 0 ? `KSh ${priceNum.toLocaleString("en-KE")}` : "";
    const discount = p.discountAllowed ? `${p.discountAllowed}%` : "";
    const finalPrice = p.basePrice && p.discountAllowed
      ? `KSh ${Math.round(p.basePrice + (p.basePrice * p.discountAllowed) / 100).toLocaleString("en-KE")}`
      : priceStr;
    const mainImg = isPublicUrl(p.image) ? p.image : "No image available";
    const desc = p.description || "";
    const selling = p.features?.[0] || (p.longDescription ? p.longDescription.split(".")[0] : desc.split(".")[0] || "");
    const priority: ExportRow["Marketing Priority"] =
      priceNum > 0 && isPublicUrl(p.image) && desc.length > 60 ? "High"
      : priceNum > 0 && isPublicUrl(p.image) ? "Medium"
      : "Low";
    return {
      "Product Name": p.name,
      "Product Category": catName,
      "Product Page Link": `${SITE_DOMAIN}/product/${p.id}`,
      "Price": priceStr,
      "Discount Allowed": discount,
      "Final Display Price": finalPrice,
      "Size / Specifications": p.size || "",
      "Short Product Description": desc,
      "Main Selling Point": selling,
      "Stock Status": p.availability || "",
      "Supplier Name": p.seller || p.businessName || "",
      "Supplier Phone Number": "",
      "Business Location": [p.exactLocation, p.location, p.county].filter(Boolean).join(", "),
      "Product Image URL": mainImg,
      "Additional Image URLs": "",
      "Marketing Priority": priority,
    };
  });

  const bizRows: ExportRow[] = biz.map((p) => {
    const catName = CATEGORIES.find((c) => c.slug === p.category)?.name ?? p.category ?? "";
    const priceNum = p.price || 0;
    const priceStr = priceNum > 0 ? `KSh ${priceNum.toLocaleString("en-KE")}` : "";
    const publicImgs = (p.images || []).filter(isPublicUrl);
    const main = publicImgs[0] || "No image available";
    const additional = publicImgs.slice(1).join(", ");
    const desc = p.description || "";
    const priority: ExportRow["Marketing Priority"] =
      priceNum > 0 && publicImgs.length > 0 && desc.length > 60 ? "High"
      : priceNum > 0 && publicImgs.length > 0 ? "Medium"
      : "Low";
    return {
      "Product Name": p.name,
      "Product Category": catName,
      "Product Page Link": `${SITE_DOMAIN}/product/${p.id}`,
      "Price": priceStr,
      "Discount Allowed": p.discountAllowed ? `${p.discountAllowed}%` : "",
      "Final Display Price": priceStr,
      "Size / Specifications": "",
      "Short Product Description": desc,
      "Main Selling Point": desc.split(".")[0] || "",
      "Stock Status": p.status === "approved" ? "In Stock" : (p.status || ""),
      "Supplier Name": p.supplierName || p.businessName || "",
      "Supplier Phone Number": p.supplierPhone || "",
      "Business Location": p.supplierLocation || [p.exactLocation, p.location, p.county].filter(Boolean).join(", "),
      "Product Image URL": main,
      "Additional Image URLs": additional,
      "Marketing Priority": priority,
    };
  });

  return [...catRows, ...bizRows];
}

function toCSV(rows: ExportRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]) as (keyof ExportRow)[];
  const esc = (v: string) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(String(r[h] ?? ""))).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

function toTSV(rows: ExportRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]) as (keyof ExportRow)[];
  const clean = (v: string) => String(v ?? "").replace(/[\t\r\n]+/g, " ");
  const lines = [headers.join("\t")];
  for (const r of rows) lines.push(headers.map((h) => clean(String(r[h] ?? ""))).join("\t"));
  return lines.join("\n");
}

function MarketingExport({ products }: { products: Product[] }) {
  const [busy, setBusy] = useState<"csv" | "copy" | null>(null);

  const handleDownload = () => {
    setBusy("csv");
    toast.loading("Preparing product sheet…", { id: "mx-export" });
    try {
      const rows = buildExportRows(products);
      const csv = toCSV(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url; a.download = `meridian-express-products-${stamp}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("Product sheet exported successfully.", { id: "mx-export" });
    } catch {
      toast.error("Could not export product sheet. Please try again.", { id: "mx-export" });
    } finally { setBusy(null); }
  };

  const handleCopy = async () => {
    setBusy("copy");
    toast.loading("Preparing product sheet…", { id: "mx-copy" });
    try {
      const rows = buildExportRows(products);
      await navigator.clipboard.writeText(toTSV(rows));
      toast.success("Product sheet copied. Paste it into ChatGPT or a spreadsheet.", { id: "mx-copy" });
    } catch {
      toast.error("Could not export product sheet. Please try again.", { id: "mx-copy" });
    } finally { setBusy(null); }
  };

  const total = products.length + (() => {
    try { return (JSON.parse(localStorage.getItem("me_biz_products") || "[]") as unknown[]).length; } catch { return 0; }
  })();

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Marketing Export</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Export every product ({total}) as a clean sheet — with public product page links and image URLs — ready to paste into ChatGPT for poster and marketing copy.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleDownload} disabled={busy !== null}>
          {busy === "csv" ? "Preparing…" : "Export Product Sheet (CSV)"}
        </Button>
        <Button variant="outline" onClick={handleCopy} disabled={busy !== null}>
          {busy === "copy" ? "Preparing…" : "Copy Table to Clipboard"}
        </Button>
      </div>
    </div>
  );
}

type BizFilter = "all" | "new" | "category" | "county" | "business";
function BusinessUploadedProducts() {
  const [items, setItems] = useState<BusinessProduct[]>([]);
  const [filter, setFilter] = useState<BizFilter>("new");
  const [q, setQ] = useState("");

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("me_biz_products") || "[]") as BusinessProduct[];
      setItems(raw.sort((a, b) => b.createdAt - a.createdAt));
    } catch { setItems([]); }
  }, []);

  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const visible = items.filter((p) => {
    if (filter === "new" && now - p.createdAt > WEEK) return false;
    if (!q) return true;
    const hay = [p.name, p.businessName, p.category, p.county, p.supplierName, p.supplierLocation].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const filters: { id: BizFilter; label: string }[] = [
    { id: "new", label: "New Products (Last 7 days)" },
    { id: "all", label: "All Uploaded Products" },
    { id: "category", label: "By Category" },
    { id: "county", label: "By County" },
    { id: "business", label: "By Business" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Business-Uploaded Products</h2>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, business, supplier, county…"
          className="rounded-md border border-border bg-secondary px-3 py-2 text-sm w-full sm:w-auto" />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Products from business accounts go live immediately. Filter and review new uploads here. Supplier details are admin-only.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-wider ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">Business</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">County</th>
              <th className="px-3 py-2 text-right">Base</th>
              <th className="px-3 py-2 text-right">Disc%</th>
              <th className="px-3 py-2 text-right">Selling</th>
              <th className="px-3 py-2 text-left">Supplier</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No uploaded products in this view.</td></tr>}
            {visible.map((p) => {
              const disc = p.discountAllowed ?? 10;
              const selling = Math.round(p.price * (1 + disc / 100));
              const isNew = Date.now() - p.createdAt <= WEEK;
              return (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleDateString()}
                    {isNew && <span className="ml-1 rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase">New</span>}
                  </td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2 text-xs">{p.businessName}</td>
                  <td className="px-3 py-2 text-xs">{p.category}</td>
                  <td className="px-3 py-2 text-xs">{p.county} {p.exactLocation && <div className="text-muted-foreground">{p.exactLocation}</div>}</td>
                  <td className="px-3 py-2 text-right">{formatKES(p.price)}</td>
                  <td className="px-3 py-2 text-right">{disc}%</td>
                  <td className="px-3 py-2 text-right font-semibold text-primary">{formatKES(selling)}</td>
                  <td className="px-3 py-2 text-xs">
                    {p.supplierName || "—"}
                    {p.supplierPhone && <div className="text-muted-foreground">{p.supplierPhone}</div>}
                    {p.supplierLocation && <div className="text-muted-foreground">{p.supplierLocation}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatalogProductEditor({ product, onChange }: { product: Product; onChange: () => void }) {
  const [form, setForm] = useState<{
    name: string;
    price: string;
    image: string;
    category: string;
    description: string;
    condition: string;
    availability: Product["availability"];
    productStatus: "Active" | "Inactive";
  }>({
    name: product.name,
    price: String(product.originalPrice ?? product.price),
    image: product.image,
    category: product.category,
    description: product.description,
    condition: product.condition ?? "New",
    availability: product.availability,
    productStatus: product.productStatus ?? "Active",
  });

  const save = () => {
    saveCatalogOverride(product.id, {
      name: form.name,
      price: Number(form.price) || product.price,
      image: form.image,
      category: form.category,
      description: form.description,
      condition: form.condition,
      availability: form.availability as Product["availability"],
      productStatus: form.productStatus as Product["productStatus"],
    });
    toast.success("Product updated");
    onChange();
  };

  const supplierPrice = Number(form.price) || 0;
  const pct = effectiveIncreasePercent({ id: product.id, category: form.category, name: form.name, price: supplierPrice });
  const exempt = isPriceExempt({ id: product.id, category: form.category, name: form.name });
  const finalPrice = exempt ? supplierPrice : Math.round(supplierPrice * (1 + pct / 100));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start gap-4">
        <img src={form.image} alt={form.name} className="h-24 w-24 rounded-xl object-cover bg-secondary" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold line-clamp-2">{form.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">Selling: <span className="font-semibold text-primary">{formatKES(finalPrice)}</span></div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-secondary px-2 py-1 text-muted-foreground">{form.condition}</span>
            <span className="rounded-full bg-secondary px-2 py-1 text-muted-foreground">{form.productStatus}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3 text-xs grid grid-cols-3 gap-2">
        <div>
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Original</div>
          <div className="font-semibold">{formatKES(supplierPrice)}</div>
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Increase</div>
          <div className="font-semibold">{exempt ? "Exempt" : `${pct}%`}</div>
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Selling</div>
          <div className="font-semibold text-primary">{formatKES(finalPrice)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 block">
          <span className="text-xs font-medium text-muted-foreground">Product Name</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Supplier / Original Price (KSh)</span>
          <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Category</span>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
            {CATEGORIES.map((category) => (
              <option key={category.slug} value={category.slug}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2 block">
          <span className="text-xs font-medium text-muted-foreground">Image URL</span>
          <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Condition</span>
          <input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Stock Status</span>
          <select value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value as Product["availability"] })} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
            <option value="In Stock">In Stock</option>
            <option value="Made to Order">Made to Order</option>
          </select>
        </label>
        <label className="sm:col-span-2 block">
          <span className="text-xs font-medium text-muted-foreground">Short Description</span>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-[90px] w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        <label className="sm:col-span-2 block">
          <span className="text-xs font-medium text-muted-foreground">Product Status</span>
          <select value={form.productStatus} onChange={(e) => setForm({ ...form, productStatus: e.target.value as "Active" | "Inactive" })} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save}>Save Product</Button>
      </div>
    </div>
  );
}

function Overview({ agents, orders }: { agents: Agent[]; orders: Order[] }) {
  const totalSales = orders.reduce((a, o) => a + Number(o.total), 0);
  const pendingApproval = orders.filter((o) => !o.admin_approved && o.status !== "cancelled").length;
  const approvedOrders = orders.filter((o) => o.admin_approved);
  const approvedSales = approvedOrders.reduce((a, o) => a + Number(o.total), 0);
  const potentialComm = orders.filter((o) => !o.admin_approved && o.referral_code && o.status !== "cancelled").reduce((a, o) => a + Number(o.commission_amount), 0);
  const confirmedComm = approvedOrders.reduce((a, o) => a + Number(o.commission_amount), 0);
  const paidComm = orders.filter((o) => o.commission_status === "paid").reduce((a, o) => a + Number(o.commission_amount), 0);
  const cards = [
    { icon: Users, label: "Total Agents", value: agents.length },
    { icon: Clock, label: "Pending Agents", value: agents.filter((a) => a.status === "pending").length },
    { icon: CheckCircle2, label: "Approved Agents", value: agents.filter((a) => a.status === "approved").length },
    { icon: ShoppingBag, label: "Total Orders", value: orders.length },
    { icon: Clock, label: "Pending Approval", value: pendingApproval },
    { icon: CheckCircle2, label: "Approved Orders", value: approvedOrders.length },
    { icon: XCircle, label: "Cancelled Orders", value: orders.filter((o) => o.status === "cancelled").length },
    { icon: Wallet, label: "Gross Revenue", value: formatKES(totalSales) },
    { icon: Wallet, label: "Approved Revenue", value: formatKES(approvedSales) },
    { icon: Clock, label: "Potential Commission", value: formatKES(potentialComm) },
    { icon: CheckCircle2, label: "Confirmed Commission", value: formatKES(confirmedComm) },
    { icon: Wallet, label: "Paid Commission", value: formatKES(paidComm) },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
          <c.icon className="h-5 w-5 text-primary" />
          <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
          <div className="mt-1 text-2xl font-semibold">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function AgentsTab({ agents, onChange }: { agents: Agent[]; onChange: () => void }) {
  const [filter, setFilter] = useState<string>("all");
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const filtered = filter === "all" ? agents : agents.filter((a) => a.status === filter);
  const pendingCount = agents.filter((a) => a.status === "pending").length;

  const update = async (id: string, status: Agent["status"]) => {
    const { error } = await supabase.from("agents").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Agent ${status}`); onChange(); }
  };

  const bulkApprove = async () => {
    setBulkLoading(true);
    const { data, error } = await supabase.rpc("bulk_approve_pending_agents");
    setBulkLoading(false);
    setConfirmBulk(false);
    if (error) return toast.error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    const a = row?.approved_count ?? 0, s = row?.skipped_count ?? 0, f = row?.failed_count ?? 0;
    toast.success(`All pending subagent applications have been approved successfully. Approved: ${a} · Skipped: ${s} · Failed: ${f}`);
    onChange();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "rejected", "suspended"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-wider ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>{s}</button>
          ))}
        </div>
        <Button size="sm" disabled={pendingCount === 0 || bulkLoading} onClick={() => setConfirmBulk(true)}>
          Approve All Pending Subagents{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </Button>
      </div>
      {confirmBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !bulkLoading && setConfirmBulk(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">Approve All Pending Subagents</h3>
            <p className="mt-2 text-sm text-muted-foreground">Are you sure you want to approve all pending subagent applications? This action will activate all currently pending accounts ({pendingCount}).</p>
            <div className="mt-5 flex gap-2 justify-end flex-wrap">
              <Button variant="outline" onClick={() => setConfirmBulk(false)} disabled={bulkLoading}>Cancel</Button>
              <Button onClick={bulkApprove} disabled={bulkLoading}>{bulkLoading ? "Approving…" : "Approve All"}</Button>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Contact</th><th className="px-4 py-3 text-left">Location</th><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Applied</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No agents.</td></tr>}
            {filtered.map((a) => (
              <tr key={a.id} className="border-t border-border align-top">
                <td className="px-4 py-3 font-medium">{a.full_name}<div className="text-xs text-muted-foreground">{a.email}</div></td>
                <td className="px-4 py-3 text-xs">{a.phone}</td>
                <td className="px-4 py-3 text-xs">{a.county} {a.area && `· ${a.area}`}</td>
                <td className="px-4 py-3 text-xs font-mono">{a.referral_code || "—"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${a.status === "approved" ? "bg-primary/10 text-primary" : a.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}>{a.status}</span></td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(a.applied_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {a.status !== "approved" && <Button size="sm" onClick={() => update(a.id, "approved")} className="mr-1">Approve</Button>}
                  {a.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => update(a.id, "rejected")} className="mr-1">Reject</Button>}
                  {a.status === "approved" && <Button size="sm" variant="outline" onClick={() => update(a.id, "suspended")}>Suspend</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ORDER_STATUSES = ["new", "contacted", "confirmed", "paid", "delivered", "cancelled"];
const TRACKING_STATUSES: { value: string; label: string }[] = [
  { value: "order_received", label: "Order Received" },
  { value: "confirmed", label: "Confirmed by Meridian Express" },
  { value: "supplier_contacted", label: "Supplier Contacted" },
  { value: "at_supplier", label: "At Supplier's Premise" },
  { value: "on_route", label: "On Route" },
  { value: "at_delivery_point", label: "At Delivery Point" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

type OrderFilter =
  | "all" | "whatsapp" | "email" | "non-whatsapp" | "pending" | "approved" | "cancelled" | "with-ref" | "without-ref";

function OrdersTab({ orders, onChange }: { orders: Order[]; onChange: () => void }) {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const update = async (id: string, status: string) => {
    const { error } = await supabase.from("sales_orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); onChange(); }
  };
  const updateTracking = async (id: string, tracking_status: string) => {
    const { error } = await supabase.from("sales_orders").update({ tracking_status } as never).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Tracking updated — customer will see it"); onChange(); }
  };
  const approve = async (id: string) => {
    const { error } = await supabase.from("sales_orders").update({ admin_approved: true, status: "confirmed" } as never).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Order approved — agent commission confirmed"); onChange(); }
  };
  const visible = orders.filter((o) => {
    switch (filter) {
      case "all": return true;
      case "whatsapp": return (o.order_type ?? "whatsapp") === "whatsapp";
      case "email": return o.order_type === "email";
      case "non-whatsapp": return o.order_type === "non-whatsapp";
      case "pending": return !o.admin_approved && o.status !== "cancelled";
      case "approved": return o.admin_approved;
      case "cancelled": return o.status === "cancelled";
      case "with-ref": return !!o.referral_code;
      case "without-ref": return !o.referral_code;
    }
  });
  const trackingLabel = (v?: string | null) =>
    TRACKING_STATUSES.find((s) => s.value === (v ?? "order_received"))?.label ?? (v ?? "Order Received");
  const exportExcel = () => {
    const rows = visible.map((o) => ({
      Name: o.customer_name || "Guest",
      Number: o.customer_phone || "",
      "Type of Order": o.order_type === "non-whatsapp" ? "Non-WhatsApp Order" : o.order_type === "email" ? "Email Order" : "WhatsApp Order",
      "Products Ordered": (o.items || []).map((i) => `${i.name} x${i.qty}`).join(", "),
      "Total Amount": `KSh ${Number(o.total).toLocaleString("en-KE")}`,
      Progress: trackingLabel(o.tracking_status),
      "Referral Code": o.referral_code || "",
      Agent: o.agent_name || "",
      "Date Ordered": new Date(o.created_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 45 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const d = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Meridian_Express_Orders_Export_${d}.xlsx`);
  };
  const summary = {
    total: orders.length,
    whatsapp: orders.filter((o) => (o.order_type ?? "whatsapp") === "whatsapp").length,
    email: orders.filter((o) => o.order_type === "email").length,
    non: orders.filter((o) => o.order_type === "non-whatsapp").length,
    confirmed: orders.filter((o) => o.admin_approved).length,
    pending: orders.filter((o) => !o.admin_approved && o.status !== "cancelled").length,
    delivered: orders.filter((o) => o.tracking_status === "delivered" || o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled" || o.tracking_status === "cancelled").length,
  };
  const filterChips: { id: OrderFilter; label: string }[] = [
    { id: "all", label: "All Orders" },
    { id: "whatsapp", label: "WhatsApp Orders" },
    { id: "email", label: "Email Orders" },
    { id: "non-whatsapp", label: "Non-WhatsApp Orders" },
    { id: "pending", label: "Pending Potential" },
    { id: "approved", label: "Approved Real" },
    { id: "cancelled", label: "Cancelled" },
    { id: "with-ref", label: "With Agent Referral" },
    { id: "without-ref", label: "Without Referral" },
  ];
  return (
    <>
    <div className="mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-center">
      {[
        { label: "Total", value: summary.total },
        { label: "WhatsApp", value: summary.whatsapp },
        { label: "Email", value: summary.email },
        { label: "Non-WhatsApp", value: summary.non },
        { label: "Confirmed", value: summary.confirmed },
        { label: "Pending", value: summary.pending },
        { label: "Delivered", value: summary.delivered },
        { label: "Cancelled", value: summary.cancelled },
      ].map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-card p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
          <div className="text-xl font-bold">{s.value}</div>
        </div>
      ))}
    </div>
    <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
      <div className="text-xs text-muted-foreground">Showing {visible.length} order(s){filter !== "all" ? " (filtered)" : ""}.</div>
      <Button size="sm" onClick={exportExcel}>Export Orders to Excel</Button>
    </div>
    <div className="flex gap-2 mb-4 flex-wrap">
      {filterChips.map((c) => (
        <button key={c.id} onClick={() => setFilter(c.id)}
          className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-wider ${filter === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
          {c.label}
        </button>
      ))}
    </div>
    <div className="rounded-2xl border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Items</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-left">Agent</th><th className="px-4 py-3 text-right">Commission</th><th className="px-4 py-3 text-left">Approval</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Customer Tracking</th></tr>
        </thead>
        <tbody>
          {visible.length === 0 && <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">No orders.</td></tr>}
          {visible.map((o) => (
            <tr key={o.id} className="border-t border-border">
              <td className="px-4 py-3 whitespace-nowrap text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${o.order_type === "non-whatsapp" ? "bg-blue-100 text-blue-700" : o.order_type === "email" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {o.order_type === "non-whatsapp" ? "Non-WhatsApp" : o.order_type === "email" ? "Email" : "WhatsApp"}
                </span>
              </td>
              <td className="px-4 py-3">{o.customer_name || "Guest"}<div className="text-xs text-muted-foreground">{o.customer_phone}</div></td>
              <td className="px-4 py-3 text-xs max-w-xs">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
              <td className="px-4 py-3 text-right font-medium">{formatKES(Number(o.total))}</td>
              <td className="px-4 py-3 text-xs">{o.agent_name || "—"}<div className="text-muted-foreground font-mono">{o.referral_code}</div></td>
              <td className="px-4 py-3 text-right text-primary font-semibold">
                {formatKES(Number(o.commission_amount))}
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{o.admin_approved ? "Confirmed" : o.referral_code ? "Potential" : "—"}</div>
              </td>
              <td className="px-4 py-3">
                {o.admin_approved
                  ? <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium uppercase">Approved</span>
                  : <Button size="sm" onClick={() => approve(o.id)}>Approve as True Order</Button>}
              </td>
              <td className="px-4 py-3">
                <select value={o.status} onChange={(e) => update(o.id, e.target.value)}
                  className="rounded-md border border-border bg-secondary px-2 py-1 text-xs">
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="px-4 py-3">
                <select value={o.tracking_status ?? "order_received"} onChange={(e) => updateTracking(o.id, e.target.value)}
                  className="rounded-md border border-border bg-secondary px-2 py-1 text-xs">
                  {TRACKING_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

const COMM_STATUSES = ["pending", "approved", "paid", "cancelled"];

function CommissionsTab({ orders, onChange }: { orders: Order[]; onChange: () => void }) {
  const refOrders = orders.filter((o) => o.referral_code);
  const update = async (id: string, commission_status: string) => {
    const { error } = await supabase.from("sales_orders").update({ commission_status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); onChange(); }
  };
  return (
    <div className="rounded-2xl border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Agent</th><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-right">Order Value</th><th className="px-4 py-3 text-right">Commission</th><th className="px-4 py-3 text-left">Status</th></tr>
        </thead>
        <tbody>
          {refOrders.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No agent-attributed orders yet.</td></tr>}
          {refOrders.map((o) => (
            <tr key={o.id} className="border-t border-border">
              <td className="px-4 py-3 whitespace-nowrap text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">{o.agent_name}</td>
              <td className="px-4 py-3 font-mono text-xs">{o.referral_code}</td>
              <td className="px-4 py-3 text-right">{formatKES(Number(o.total))}</td>
              <td className="px-4 py-3 text-right text-primary font-semibold">{formatKES(Number(o.commission_amount))}</td>
              <td className="px-4 py-3">
                <select value={o.commission_status} onChange={(e) => update(o.id, e.target.value)}
                  className="rounded-md border border-border bg-secondary px-2 py-1 text-xs">
                  {COMM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="max-w-2xl rounded-2xl border border-border bg-card p-6">
      <h2 className="font-semibold">Commission</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Commission is calculated automatically from each agent-referred order using the
        existing revenue formula (40% of the Meridian Express margin per item). Manage per-order
        commission status from the Commissions tab.
      </p>
    </div>
  );
}

function CategoryPricingPanel({ onChange }: { onChange: () => void }) {
  const [tick, setTick] = useState(0);
  const markups = useMemo(() => getCategoryMarkups(), [tick]);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const m = getCategoryMarkups();
    const out: Record<string, string> = {};
    for (const c of CATEGORIES) out[c.slug] = m[c.slug] != null ? String(m[c.slug]) : "";
    return out;
  });

  const save = (slug: string) => {
    const v = Number(drafts[slug]);
    if (Number.isNaN(v) || v < 0) { toast.error("Enter a valid percentage"); return; }
    saveCategoryMarkup(slug, v);
    setTick((t) => t + 1);
    onChange();
    toast.success(`${CATEGORIES.find((c) => c.slug === slug)?.name} → ${v}%`);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Category Percentage Settings</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Set the % markup applied on top of every supplier price in a category. Final Selling Price = Supplier Price + %. Food Vending Trolleys use their manually curated price and ignore this table.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Default</th>
              <th className="px-3 py-2 text-right">Current %</th>
              <th className="px-3 py-2 text-right">Set / Update</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => {
              const current = markups[c.slug];
              const def = DEFAULT_CATEGORY_MARKUPS[c.slug];
              return (
                <tr key={c.slug} className="border-t border-border">
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{def != null ? `${def}%` : "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{current != null ? `${current}%` : "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-2">
                      <input
                        type="number"
                        min={0}
                        value={drafts[c.slug] ?? ""}
                        onChange={(e) => setDrafts({ ...drafts, [c.slug]: e.target.value })}
                        className="w-20 rounded-md border border-border bg-secondary px-2 py-1 text-sm text-right"
                        placeholder="%"
                      />
                      <Button size="sm" onClick={() => save(c.slug)}>Save</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductPricingExport({ products }: { products: Product[] }) {
  const [busy, setBusy] = useState(false);

  const handleDownload = () => {
    setBusy(true);
    try {
      const rows = products.map((p) => {
        const original = p.originalPrice ?? p.price;
        const pct = effectiveIncreasePercent({ id: p.id, category: p.category, name: p.name, price: original });
        const exempt = isPriceExempt(p);
        const selling = exempt ? original : Math.round(original * (1 + pct / 100));
        return {
          "Product Name": p.name,
          "Category": CATEGORIES.find((c) => c.slug === p.category)?.name ?? p.category,
          "Supplier / Original Price (KSh)": original || 0,
          "Category % Increase": exempt ? "Exempt" : `${pct}%`,
          "Final Selling Price (KSh)": selling || 0,
          "Supplier Name": p.seller || p.businessName || "",
          "Supplier Phone Number": "",
          "Supplier Location": [p.exactLocation, p.location, p.county].filter(Boolean).join(", "),
          "Stock Status": p.availability || "",
          "Date Added": p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
          "Last Updated": new Date().toLocaleDateString(),
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 34 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Product Pricing");
      const d = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Meridian_Express_Product_Pricing_${d}.xlsx`);
      toast.success("Pricing sheet exported.");
    } catch {
      toast.error("Could not export pricing sheet.");
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Product Pricing Export</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Download an Excel sheet showing Supplier/Original Price, Category % Increase, and Final Selling Price for every catalog product — admin-only pricing data.
      </p>
      <div className="mt-4">
        <Button onClick={handleDownload} disabled={busy}>{busy ? "Preparing…" : "Export Product Pricing Sheet (Excel)"}</Button>
      </div>
    </div>
  );
}

/* ================== Product Introducers ================== */
type PI = {
  id: string; full_name: string; email: string; phone: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  referral_code: string | null; county: string | null; town: string | null;
  mpesa_number: string | null; applied_at: string;
};
type PICommission = {
  id: string; product_introducer_id: string; order_id: string;
  product_name: string | null; sale_amount: number; commission_amount: number;
  status: string; created_at: string; payment_reference: string | null;
};
type PIBusiness = { id: string; business_name: string; product_introducer_id: string | null; created_at: string };

function IntroducersTab() {
  const [pis, setPis] = useState<PI[]>([]);
  const [comms, setComms] = useState<PICommission[]>([]);
  const [bizs, setBizs] = useState<PIBusiness[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [{ data: p }, { data: c }, { data: b }] = await Promise.all([
      supabase.from("product_introducers").select("*").order("applied_at", { ascending: false }),
      supabase.from("pi_commissions").select("*").order("created_at", { ascending: false }),
      supabase.from("businesses").select("id,business_name,product_introducer_id,created_at").not("product_introducer_id", "is", null),
    ]);
    setPis((p as unknown as PI[]) || []);
    setComms((c as unknown as PICommission[]) || []);
    setBizs((b as unknown as PIBusiness[]) || []);
  };
  useEffect(() => { refresh(); }, []);

  const setStatus = async (id: string, status: PI["status"]) => {
    setBusy(true);
    const { error } = await supabase.from("product_introducers").update({ status }).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Introducer ${status}`);
    refresh();
  };

  const setCommissionStatus = async (id: string, status: string, payment_reference?: string) => {
    setBusy(true);
    const patch: { status: string; paid_at?: string; payment_reference?: string } = { status };
    if (status === "paid") { patch.paid_at = new Date().toISOString(); if (payment_reference) patch.payment_reference = payment_reference; }
    const { error } = await supabase.from("pi_commissions").update(patch).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Commission updated");
    refresh();
  };

  const totalCommission = comms.reduce((a, c) => a + Number(c.commission_amount), 0);
  const pendingCommission = comms.filter(c => c.status === "confirmed" || c.status === "payable").reduce((a, c) => a + Number(c.commission_amount), 0);
  const paidCommission = comms.filter(c => c.status === "paid").reduce((a, c) => a + Number(c.commission_amount), 0);

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const rows = comms.map((c) => {
      const pi = pis.find(p => p.id === c.product_introducer_id);
      return {
        "Introducer": pi?.full_name || "",
        "Referral Code": pi?.referral_code || "",
        "Phone": pi?.phone || "",
        "Order ID": c.order_id,
        "Product": c.product_name || "",
        "Sale Amount (KES)": Number(c.sale_amount),
        "Commission (KES)": Number(c.commission_amount),
        "Status": c.status,
        "Payment Reference": c.payment_reference || "",
        "Date": new Date(c.created_at).toLocaleString(),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PI Commissions");
    XLSX.writeFile(wb, `pi-commissions-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Product Introducers" value={pis.length.toString()} />
        <MiniStat label="Suppliers Linked" value={bizs.length.toString()} />
        <MiniStat label="Pending Commission" value={formatKES(pendingCommission)} />
        <MiniStat label="Paid Commission" value={formatKES(paidCommission)} accent />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Product Introducers</h2>
          <Button size="sm" variant="outline" onClick={exportXlsx}>Export Excel</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-left">Phone</th><th className="px-4 py-3 text-left">Location</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {pis.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No applications yet.</td></tr>}
              {pis.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">{p.full_name}<div className="text-xs text-muted-foreground">{p.email}</div></td>
                  <td className="px-4 py-3 font-mono text-xs">{p.referral_code || "—"}</td>
                  <td className="px-4 py-3">{p.phone}</td>
                  <td className="px-4 py-3">{[p.county, p.town].filter(Boolean).join(", ")}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] uppercase">{p.status}</span></td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {p.status === "pending" && <>
                      <Button size="sm" onClick={() => setStatus(p.id, "approved")} disabled={busy}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "rejected")} disabled={busy}>Reject</Button>
                    </>}
                    {p.status === "approved" && <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "suspended")} disabled={busy}>Suspend</Button>}
                    {p.status === "suspended" && <Button size="sm" onClick={() => setStatus(p.id, "approved")} disabled={busy}>Reactivate</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">PI Commissions</h2>
          <span className="text-xs text-muted-foreground">Total: {formatKES(totalCommission)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Introducer</th><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-right">Sale</th><th className="px-4 py-3 text-right">Commission</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {comms.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No commissions yet.</td></tr>}
              {comms.map((c) => {
                const pi = pis.find(p => p.id === c.product_introducer_id);
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{pi?.full_name || "—"}<div className="text-xs text-muted-foreground font-mono">{pi?.referral_code}</div></td>
                    <td className="px-4 py-3">{c.product_name || "—"}</td>
                    <td className="px-4 py-3 text-right">{formatKES(Number(c.sale_amount))}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">{formatKES(Number(c.commission_amount))}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[10px] uppercase">{c.status}</span></td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {c.status === "confirmed" && <Button size="sm" onClick={() => setCommissionStatus(c.id, "payable")} disabled={busy}>Mark Payable</Button>}
                      {c.status === "payable" && <Button size="sm" onClick={() => {
                        const ref = window.prompt("Payment reference (optional)") || "";
                        setCommissionStatus(c.id, "paid", ref);
                      }} disabled={busy}>Mark Paid</Button>}
                      {(c.status === "confirmed" || c.status === "payable") && <Button size="sm" variant="outline" onClick={() => setCommissionStatus(c.id, "cancelled")} disabled={busy}>Cancel</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============= Assignments Tab ============= */

const IMPL_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "unassigned", label: "Unassigned" },
  { value: "assigned", label: "Assigned" },
  { value: "customer_contacted", label: "Customer Contacted" },
  { value: "visit_scheduled", label: "Visit Scheduled" },
  { value: "quotation_sent", label: "Quotation Sent" },
  { value: "awaiting_customer_confirmation", label: "Awaiting Customer Confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "completed", label: "Completed" },
  { value: "unable_to_complete", label: "Unable to Complete" },
  { value: "cancelled", label: "Cancelled" },
];
const implLabel = (s?: string | null) => IMPL_STATUS_OPTIONS.find((x) => x.value === s)?.label ?? "Unassigned";

function AssignmentsTab({ orders, onChange }: { orders: Order[]; onChange: () => void }) {
  const [filter, setFilter] = useState<"all" | "unassigned" | "assigned" | "active" | "completed">("all");
  const [openFor, setOpenFor] = useState<string | null>(null);

  const visible = orders.filter((o) => {
    if (filter === "unassigned") return !o.assigned_agent_id;
    if (filter === "assigned") return !!o.assigned_agent_id;
    if (filter === "active") return o.assigned_agent_id && !["completed", "cancelled", "unable_to_complete"].includes(o.implementation_status || "");
    if (filter === "completed") return o.implementation_status === "completed";
    return true;
  });

  const summary = {
    unassigned: orders.filter((o) => !o.assigned_agent_id).length,
    assigned: orders.filter((o) => !!o.assigned_agent_id).length,
    active: orders.filter((o) => o.assigned_agent_id && !["completed", "cancelled", "unable_to_complete"].includes(o.implementation_status || "")).length,
    completed: orders.filter((o) => o.implementation_status === "completed").length,
  };

  const chips: { id: typeof filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unassigned", label: `Unassigned (${summary.unassigned})` },
    { id: "assigned", label: `Assigned (${summary.assigned})` },
    { id: "active", label: `Active (${summary.active})` },
    { id: "completed", label: `Completed (${summary.completed})` },
  ];

  const exportExcel = () => {
    const rows = visible.map((o) => ({
      "Order #": o.id.slice(0, 8),
      Customer: o.customer_name || "Guest",
      Phone: o.customer_phone || "",
      Location: [o.customer_area, o.customer_town, o.customer_county].filter(Boolean).join(", "),
      Products: o.items.map((i) => `${i.name} x${i.qty}`).join(", "),
      Total: `KSh ${Number(o.total).toLocaleString("en-KE")}`,
      Implementer: o.agent_name || "",
      "Referral Code": o.referral_code || "",
      "Assigned At": o.assigned_at ? new Date(o.assigned_at).toLocaleString() : "",
      "Implementation Status": implLabel(o.implementation_status),
      "Commission Amount": `KSh ${Number(o.commission_amount || 0).toLocaleString("en-KE")}`,
      "Commission Status": o.commission_status || "",
      "Payment Status": o.payment_status || "",
      "Approval Status": o.admin_approved ? "Approved" : "Pending",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assignments");
    XLSX.writeFile(wb, `Meridian_Express_Assignments_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
        {[
          { label: "Unassigned", value: summary.unassigned },
          { label: "Assigned", value: summary.assigned },
          { label: "Active", value: summary.active },
          { label: "Completed", value: summary.completed },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-wider ${filter === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={exportExcel}>Export to Excel</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Products</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Implementer</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No orders in this view.</td></tr>}
            {visible.map((o) => (
              <>
                <tr key={o.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{o.customer_name || "Guest"}<div className="text-xs text-muted-foreground">{o.customer_phone}</div></td>
                  <td className="px-4 py-3 text-xs">{[o.customer_area, o.customer_town, o.customer_county].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-xs max-w-xs">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatKES(Number(o.total))}</td>
                  <td className="px-4 py-3 text-xs">{o.agent_name || <span className="text-muted-foreground">—</span>}<div className="font-mono text-muted-foreground">{o.referral_code}</div></td>
                  <td className="px-4 py-3"><span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase">{implLabel(o.implementation_status)}</span></td>
                  <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => setOpenFor(openFor === o.id ? null : o.id)}>{o.assigned_agent_id ? "Reassign" : "Assign"}</Button></td>
                </tr>
                {openFor === o.id && (
                  <tr className="bg-secondary/30">
                    <td colSpan={8} className="px-4 py-4">
                      <AssignPanel order={o} onDone={() => { setOpenFor(null); onChange(); }} onCancel={() => setOpenFor(null)} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Candidate = {
  id: string; full_name: string; phone: string | null; whatsapp: string | null;
  county: string | null; town: string | null; area: string | null;
  availability: string; active_assignments: number; referral_code: string | null;
  match_rank: number; match_label: string;
};

function AssignPanel({ order, onDone, onCancel }: { order: Order; onDone: () => void; onCancel: () => void }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_assignment_candidates", { _order_id: order.id });
      if (error) toast.error(error.message);
      setCandidates((data as Candidate[]) || []);
      setLoading(false);
    })();
  }, [order.id]);

  const nearest = candidates[0];
  const filtered = candidates.filter((c) =>
    !q.trim() ||
    c.full_name.toLowerCase().includes(q.toLowerCase()) ||
    (c.county || "").toLowerCase().includes(q.toLowerCase()) ||
    (c.town || "").toLowerCase().includes(q.toLowerCase()) ||
    (c.area || "").toLowerCase().includes(q.toLowerCase())
  );

  const submit = async () => {
    if (!selected) return toast.error("Select an implementer first");
    if (order.assigned_agent_id && !reason.trim()) return toast.error("Reassignment requires a reason");
    setSaving(true);
    const { error } = await supabase.rpc("assign_implementer", {
      _order_id: order.id, _new_agent_id: selected, _notes: notes || undefined, _reason: reason || undefined,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Implementer assigned");
    onDone();
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading candidates…</div>;
  if (candidates.length === 0) return <div className="text-sm text-muted-foreground">No approved & available implementers found. <button onClick={onCancel} className="ml-2 underline">Close</button></div>;

  return (
    <div className="grid gap-4">
      {nearest && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="text-[10px] uppercase tracking-wider text-primary font-semibold">Suggested Nearest Implementer — {nearest.match_label}</div>
          <div className="mt-1 flex flex-wrap items-center gap-3 justify-between">
            <div>
              <div className="font-semibold">{nearest.full_name}</div>
              <div className="text-xs text-muted-foreground">{nearest.phone} · {[nearest.area, nearest.town, nearest.county].filter(Boolean).join(", ") || "—"}</div>
              <div className="text-xs text-muted-foreground">{nearest.availability} · {nearest.active_assignments} active · {nearest.referral_code}</div>
            </div>
            <Button size="sm" onClick={() => setSelected(nearest.id)} variant={selected === nearest.id ? "default" : "outline"}>{selected === nearest.id ? "Selected" : "Select"}</Button>
          </div>
        </div>
      )}

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all implementers…" className="rounded-md border border-border bg-secondary px-3 py-2 text-sm" />

      <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-secondary uppercase tracking-wider text-[10px] text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Location</th>
              <th className="px-3 py-2 text-left">Availability</th>
              <th className="px-3 py-2 text-right">Active</th>
              <th className="px-3 py-2 text-left">Match</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className={`border-t border-border ${selected === c.id ? "bg-primary/5" : ""}`}>
                <td className="px-3 py-2">{c.full_name}<div className="text-muted-foreground">{c.phone}</div></td>
                <td className="px-3 py-2">{[c.area, c.town, c.county].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-3 py-2 capitalize">{c.availability}</td>
                <td className="px-3 py-2 text-right">{c.active_assignments}</td>
                <td className="px-3 py-2">{c.match_label}</td>
                <td className="px-3 py-2 text-right"><Button size="sm" variant={selected === c.id ? "default" : "outline"} onClick={() => setSelected(c.id)}>{selected === c.id ? "Selected" : "Select"}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Assignment notes (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
        </label>
        {order.assigned_agent_id && (
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Reassignment reason *</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
          </label>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving || !selected}>{saving ? "Assigning…" : order.assigned_agent_id ? "Reassign Implementer" : "Assign Implementer"}</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border p-4 ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
/* ============================================================
 * Product Introduction Agents (PIA) — admin section
 * ============================================================ */
import { listAllPIA, listAllSubmissions, listAllSuppliers, updatePIAStatus, updateSubmissionStatus, updateSupplier, publishSubmission, recordReview, notifyUser, logActivity, submissionBadgeClass, SUBMISSION_STATUS_LABEL, PIA_STATUS_LABEL, listAllCommissions, setCommissionStatus, markCommissionPaid, COMMISSION_STATUS_LABEL, commissionBadgeClass, type PIA as PIAType, type Submission as PIASubmission, type Supplier as PIASupplier, type SubmissionStatus, type PIACommission, type CommissionStatus } from "@/lib/pia";

type PIATab = "dashboard" | "agents" | "suppliers" | "submissions" | "commissions" | "activity";

function IntroAgentsTab() {
  const [sub, setSub] = useState<PIATab>("agents");
  const [agents, setAgents] = useState<PIAType[]>([]);
  const [subs, setSubs] = useState<PIASubmission[]>([]);
  const [suppliers, setSuppliers] = useState<PIASupplier[]>([]);
  const refresh = async () => {
    const [a, s, sp] = await Promise.all([listAllPIA(), listAllSubmissions(), listAllSuppliers()]);
    setAgents(a); setSubs(s); setSuppliers(sp);
  };
  useEffect(() => { refresh(); }, []);

  const counts = useMemo(() => ({
    agents: agents.length,
    pending_agents: agents.filter(a => a.status === "pending").length,
    active_agents: agents.filter(a => a.status === "active").length,
    suspended_agents: agents.filter(a => a.status === "suspended").length,
    suppliers: suppliers.length,
    drafts: subs.filter(s => s.status === "draft").length,
    submitted: subs.filter(s => ["submitted","under_review","resubmitted"].includes(s.status)).length,
    changes: subs.filter(s => s.status === "changes_requested").length,
    approved: subs.filter(s => s.status === "approved").length,
    live: subs.filter(s => s.status === "live").length,
    rejected: subs.filter(s => s.status === "rejected").length,
  }), [agents, subs, suppliers]);

  const exportXLSX = () => {
    const rows = subs.map(s => {
      const a = agents.find(x => x.id === s.agent_id);
      const sp = suppliers.find(x => x.id === (s.supplier_introduction_id || ""));
      return {
        "Submission ID": s.id,
        "Product Name": s.name,
        "Category": s.category ?? "",
        "Subcategory": s.subcategory ?? "",
        "Brand": s.brand ?? "",
        "Model": s.model ?? "",
        "Condition": s.condition ?? "",
        "Supplier Price": s.supplier_price ?? "",
        "Proposed Selling Price": s.proposed_selling_price ?? "",
        "Stock": s.stock ?? "",
        "Stock Status": s.stock_status ?? "",
        "Min Order Qty": s.min_order_qty ?? "",
        "Delivery Available": s.delivery_available ? "Yes" : "No",
        "Warranty": s.warranty ?? "",
        "Status": SUBMISSION_STATUS_LABEL[s.status],
        "Agent Code": s.agent_code ?? "",
        "Agent Name": a?.full_name ?? "",
        "Agent Phone": a?.phone ?? "",
        "Supplier Name": sp?.name ?? "",
        "Supplier Phone": sp?.phone ?? "",
        "Supplier Location": sp ? [sp.county, sp.town].filter(Boolean).join(", ") : "",
        "Admin Notes": s.admin_notes ?? "",
        "Rejection Reason": s.rejection_reason ?? "",
        "Submitted At": s.created_at,
        "Last Updated": s.updated_at,
        "Published Product ID": s.published_product_id ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PIA Submissions");
    XLSX.writeFile(wb, `pia-submissions-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const subTabs: { id: PIATab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "agents", label: `Agents (${counts.agents})` },
    { id: "suppliers", label: `Suppliers (${counts.suppliers})` },
    { id: "submissions", label: `Submissions (${subs.length})` },
    { id: "commissions", label: "Commissions" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-lg">Product Introduction Agents</h2>
            <p className="text-xs text-muted-foreground">Manage MEX-PIA agents, suppliers they introduce, and product submissions awaiting review.</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportXLSX}>Export XLSX</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${sub === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {sub === "dashboard" && (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <MiniStat label="Total Agents" value={counts.agents.toString()} />
          <MiniStat label="Pending" value={counts.pending_agents.toString()} accent={counts.pending_agents > 0} />
          <MiniStat label="Active" value={counts.active_agents.toString()} />
          <MiniStat label="Suspended" value={counts.suspended_agents.toString()} />
          <MiniStat label="Suppliers" value={counts.suppliers.toString()} />
          <MiniStat label="Drafts" value={counts.drafts.toString()} />
          <MiniStat label="Awaiting Review" value={counts.submitted.toString()} accent={counts.submitted > 0} />
          <MiniStat label="Changes Requested" value={counts.changes.toString()} />
          <MiniStat label="Approved" value={counts.approved.toString()} />
          <MiniStat label="Live" value={counts.live.toString()} />
          <MiniStat label="Rejected" value={counts.rejected.toString()} />
        </div>
      )}

      {sub === "agents" && <PIAgentsList agents={agents} onChange={refresh} />}
      {sub === "suppliers" && <PIASuppliersList suppliers={suppliers} agents={agents} onChange={refresh} />}
      {sub === "submissions" && <PIASubmissionsList subs={subs} agents={agents} suppliers={suppliers} onChange={refresh} />}
      {sub === "commissions" && <PIACommissionsPanel agents={agents} />}
      {sub === "activity" && <PIAActivityList />}
    </div>
  );
}

function PIACommissionsPanel({ agents }: { agents: PIAType[] }) {
  const [rows, setRows] = useState<PIACommission[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [payFor, setPayFor] = useState<PIACommission | null>(null);

  const refresh = async () => setRows(await listAllCommissions());
  useEffect(() => { refresh(); }, []);

  const filtered = rows.filter(r =>
    (statusFilter === "all" || r.commission_status === statusFilter) &&
    (agentFilter === "all" || r.agent_id === agentFilter) &&
    (!q || r.product_name.toLowerCase().includes(q.toLowerCase()) || (r.agent_code || "").toLowerCase().includes(q.toLowerCase()) || r.order_id.includes(q))
  );

  const totals = useMemo(() => {
    const sum = (s: CommissionStatus) => rows.filter(r => r.commission_status === s).reduce((a, r) => a + Number(r.commission_amount), 0);
    return {
      pending: sum("pending"), confirmed: sum("confirmed"), approved: sum("approved"),
      paid: sum("paid"), on_hold: sum("on_hold"), reversed: sum("reversed") + sum("cancelled"),
      owed_agents: new Set(rows.filter(r => ["confirmed","approved"].includes(r.commission_status)).map(r => r.agent_id)).size,
      sales: rows.filter(r => ["confirmed","approved","paid"].includes(r.commission_status)).length,
    };
  }, [rows]);

  const changeStatus = async (r: PIACommission, s: CommissionStatus) => {
    const { error } = await setCommissionStatus(r.id, s);
    if (error) return toast.error(error.message);
    toast.success("Updated"); refresh();
  };

  const exportXLSX = () => {
    const data = filtered.map(r => ({
      "Commission ID": r.id, "Agent Name": r.agent_name || "", "Agent Code": r.agent_code || "",
      "Order Number": r.order_id, "Product Name": r.product_name, "Supplier": r.supplier_name || "",
      "Final Unit Selling Price": Number(r.unit_price), "Quantity": r.quantity,
      "Product Line Value": Number(r.line_value), "Commission Rate": "1%",
      "Commission Amount": Number(r.commission_amount), "Order Status": r.order_status || "",
      "Commission Status": COMMISSION_STATUS_LABEL[r.commission_status], "Order Date": r.order_date,
      "Completion Date": r.completion_date, "Approval Date": r.approved_at, "Payment Date": r.paid_at,
      "Payment Method": r.payment_method || "", "Payment Reference": r.payment_reference || "",
      "Reversal Reason": r.reversal_reason || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PIA Commissions");
    XLSX.writeFile(wb, `pia-commissions-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const ksh = (n: number) => `KSh ${Math.round(n || 0).toLocaleString("en-KE")}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
        <MiniStat label="Pending" value={ksh(totals.pending)} />
        <MiniStat label="Confirmed" value={ksh(totals.confirmed)} />
        <MiniStat label="Approved for Payment" value={ksh(totals.approved)} accent={totals.approved > 0} />
        <MiniStat label="Paid" value={ksh(totals.paid)} />
        <MiniStat label="On Hold" value={ksh(totals.on_hold)} />
        <MiniStat label="Reversed / Cancelled" value={ksh(totals.reversed)} />
        <MiniStat label="Agents owed" value={totals.owed_agents.toString()} />
        <MiniStat label="Completed sales" value={totals.sales.toString()} />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap gap-2 justify-between">
          <div className="flex gap-2 flex-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm">
              <option value="all">All statuses</option>
              {Object.entries(COMMISSION_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm">
              <option value="all">All agents</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.full_name} {a.agent_code ? `(${a.agent_code})` : ""}</option>)}
            </select>
            <input placeholder="Search product / code / order…" value={q} onChange={(e) => setQ(e.target.value)}
              className="rounded-md border border-border bg-secondary px-3 py-2 text-sm w-72" />
          </div>
          <Button variant="outline" size="sm" onClick={exportXLSX}>Export XLSX</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left">Agent</th>
                <th className="px-3 py-3 text-left">Order</th>
                <th className="px-3 py-3 text-left">Product</th>
                <th className="px-3 py-3 text-right">Unit</th>
                <th className="px-3 py-3 text-right">Qty</th>
                <th className="px-3 py-3 text-right">Line</th>
                <th className="px-3 py-3 text-right">Comm.</th>
                <th className="px-3 py-3 text-left">Order</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">No commissions match.</td></tr>}
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-3 text-xs">{r.agent_name || "—"}<div className="font-mono text-[10px] text-muted-foreground">{r.agent_code}</div></td>
                  <td className="px-3 py-3 font-mono text-[10px]">{r.order_id.slice(0, 8)}</td>
                  <td className="px-3 py-3"><div className="font-medium">{r.product_name}</div><div className="text-[10px] text-muted-foreground">{r.customer_name || "—"}</div></td>
                  <td className="px-3 py-3 text-right">{ksh(Number(r.unit_price))}</td>
                  <td className="px-3 py-3 text-right">{r.quantity}</td>
                  <td className="px-3 py-3 text-right">{ksh(Number(r.line_value))}</td>
                  <td className="px-3 py-3 text-right font-semibold">{ksh(Number(r.commission_amount))}</td>
                  <td className="px-3 py-3 text-xs">{r.order_status || "—"}</td>
                  <td className="px-3 py-3"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${commissionBadgeClass(r.commission_status)}`}>{COMMISSION_STATUS_LABEL[r.commission_status]}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {r.commission_status === "pending" && <Button size="sm" variant="outline" onClick={() => changeStatus(r, "confirmed")}>Confirm</Button>}
                      {r.commission_status === "confirmed" && <Button size="sm" variant="outline" onClick={() => { if (confirm("Approve this commission for payment? Confirm that the order is completed, the payment was received, and the commission calculation is correct.")) changeStatus(r, "approved"); }}>Approve</Button>}
                      {r.commission_status === "approved" && <Button size="sm" onClick={() => setPayFor(r)}>Mark Paid</Button>}
                      {!["paid","cancelled","reversed"].includes(r.commission_status) && <Button size="sm" variant="outline" onClick={() => changeStatus(r, "on_hold")}>Hold</Button>}
                      {!["paid","cancelled","reversed"].includes(r.commission_status) && <Button size="sm" variant="outline" onClick={() => { if (confirm("Reverse this commission?")) changeStatus(r, "reversed"); }}>Reverse</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {payFor && <PayCommissionDialog c={payFor} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); refresh(); }} />}
    </div>
  );
}

function PayCommissionDialog({ c, onClose, onDone }: { c: PIACommission; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState<number>(Number(c.commission_amount));
  const [method, setMethod] = useState("M-Pesa");
  const [reference, setReference] = useState("");
  const [mpesa, setMpesa] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reference) return toast.error("Payment reference is required");
    if (Math.abs(amount - Number(c.commission_amount)) > 0.01 && !note) {
      return toast.error("Amount differs from approved commission — please add a note explaining the difference.");
    }
    if (!confirm("Are you sure you want to mark this commission as paid? This action will be recorded in the permanent payment history.")) return;
    setBusy(true);
    const { error } = await markCommissionPaid(c.id, { amount, method, reference, mpesa: mpesa || undefined, note: note || undefined });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Payment recorded"); onDone();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">Mark commission as paid</h3>
        <p className="text-xs text-muted-foreground mt-1">Agent: {c.agent_name} · {c.product_name}</p>
        <div className="mt-4 grid gap-3">
          <label className="text-xs"><span className="text-muted-foreground">Amount (KSh)</span>
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" /></label>
          <label className="text-xs"><span className="text-muted-foreground">Payment method</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm">
              <option>M-Pesa</option><option>Bank Transfer</option><option>Cash</option><option>Other</option>
            </select></label>
          <label className="text-xs"><span className="text-muted-foreground">Payment reference *</span>
            <input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" /></label>
          <label className="text-xs"><span className="text-muted-foreground">M-Pesa / account number</span>
            <input value={mpesa} onChange={(e) => setMpesa(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" /></label>
          <label className="text-xs"><span className="text-muted-foreground">Admin note</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Confirm payment"}</Button>
        </div>
      </div>
    </div>
  );
}

function PIAgentsList({ agents, onChange }: { agents: PIAType[]; onChange: () => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const filtered = agents.filter(a =>
    (filter === "all" || a.status === filter) &&
    (!q || a.full_name.toLowerCase().includes(q.toLowerCase()) || (a.agent_code || "").toLowerCase().includes(q.toLowerCase()) || a.phone.includes(q))
  );
  const setStatus = async (a: PIAType, status: PIAType["status"]) => {
    const { error } = await updatePIAStatus(a.id, status);
    if (error) return toast.error(error.message);
    if (status === "active") notifyUser(a.id, "You're approved!", "Your Product Introduction Agent account is now active.", "/product-agent");
    if (status === "rejected") notifyUser(a.id, "Application update", "Your Product Introduction Agent application was not approved.", "/product-agent");
    if (status === "suspended") notifyUser(a.id, "Account suspended", "Please contact Meridian Express.", "/product-agent");
    await logActivity({ action: `agent_${status}`, agent_id: a.id });
    toast.success("Updated"); onChange();
  };
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2 flex-wrap">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            {Object.entries(PIA_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input placeholder="Search name, code, phone…" value={q} onChange={(e) => setQ(e.target.value)}
            className="rounded-md border border-border bg-secondary px-3 py-2 text-sm w-64" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Applied</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No agents match.</td></tr>}
            {filtered.map(a => (
              <tr key={a.id} className="border-t border-border align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{a.full_name}</div>
                  <div className="text-xs text-muted-foreground">{a.email}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{a.agent_code || "—"}</td>
                <td className="px-4 py-3">{a.phone}</td>
                <td className="px-4 py-3">{[a.county, a.town].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(a.applied_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{PIA_STATUS_LABEL[a.status]}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {a.status !== "active" && <Button size="sm" variant="outline" onClick={() => setStatus(a, "active")}>Approve</Button>}
                    {a.status !== "suspended" && a.status !== "pending" && <Button size="sm" variant="outline" onClick={() => setStatus(a, "suspended")}>Suspend</Button>}
                    {a.status === "pending" && <Button size="sm" variant="outline" onClick={() => setStatus(a, "rejected")}>Reject</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PIASuppliersList({ suppliers, agents, onChange }: { suppliers: PIASupplier[]; agents: PIAType[]; onChange: () => void }) {
  const [q, setQ] = useState("");
  const setStatus = async (s: PIASupplier, status: string) => {
    const { error } = await updateSupplier(s.id, { status } as never);
    if (error) return toast.error(error.message);
    toast.success("Updated"); onChange();
  };
  const filtered = suppliers.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.phone.includes(q));
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <input placeholder="Search suppliers…" value={q} onChange={(e) => setQ(e.target.value)}
          className="rounded-md border border-border bg-secondary px-3 py-2 text-sm w-64" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3 text-left">Supplier</th><th className="px-4 py-3 text-left">Phone</th><th className="px-4 py-3 text-left">Location</th><th className="px-4 py-3 text-left">Introduced by</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No suppliers yet.</td></tr>}
            {filtered.map(s => {
              const a = agents.find(x => x.id === s.agent_id);
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.contact_person}</div></td>
                  <td className="px-4 py-3">{s.phone}</td>
                  <td className="px-4 py-3">{[s.county, s.town].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-xs">{a?.full_name || "—"}<div className="font-mono text-[10px] text-muted-foreground">{s.agent_code}</div></td>
                  <td className="px-4 py-3">
                    <select value={s.status} onChange={(e) => setStatus(s, e.target.value)}
                      className="rounded-md border border-border bg-secondary px-2 py-1 text-xs">
                      {["new","contacted","verification_pending","verified","active","rejected","suspended"].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const REASON_CODES = [
  "Missing images",
  "Insufficient description",
  "Pricing unclear",
  "Duplicate product",
  "Specifications missing",
  "Supplier verification needed",
  "Category incorrect",
];

function PIASubmissionsList({ subs, agents, suppliers, onChange }: { subs: PIASubmission[]; agents: PIAType[]; suppliers: PIASupplier[]; onChange: () => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [reviewing, setReviewing] = useState<PIASubmission | null>(null);
  const filtered = subs.filter(s =>
    (filter === "all" || s.status === filter) &&
    (!q || s.name.toLowerCase().includes(q.toLowerCase()) || (s.agent_code || "").toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            {Object.entries(SUBMISSION_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input placeholder="Search product or agent code…" value={q} onChange={(e) => setQ(e.target.value)}
            className="rounded-md border border-border bg-secondary px-3 py-2 text-sm w-72" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-right">Selling</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No submissions.</td></tr>}
              {filtered.map(s => {
                const a = agents.find(x => x.id === s.agent_id);
                const sp = suppliers.find(x => x.id === (s.supplier_introduction_id || ""));
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.category || "—"}</div></td>
                    <td className="px-4 py-3 text-xs">{a?.full_name || "—"}<div className="font-mono text-[10px] text-muted-foreground">{s.agent_code}</div></td>
                    <td className="px-4 py-3 text-xs">{sp?.name || "—"}</td>
                    <td className="px-4 py-3 text-right">{s.proposed_selling_price ? `KSh ${Number(s.proposed_selling_price).toLocaleString("en-KE")}` : "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${submissionBadgeClass(s.status)}`}>{SUBMISSION_STATUS_LABEL[s.status]}</span>
                    </td>
                    <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => setReviewing(s)}>Review</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {reviewing && <ReviewDialog s={reviewing} agent={agents.find(a => a.id === reviewing.agent_id) || null} onClose={() => setReviewing(null)} onChange={() => { setReviewing(null); onChange(); }} />}
    </>
  );
}

function ReviewDialog({ s, agent, onClose, onChange }: { s: PIASubmission; agent: PIAType | null; onClose: () => void; onChange: () => void }) {
  const [notes, setNotes] = useState(s.admin_notes || "");
  const [reason, setReason] = useState(s.rejection_reason || "");
  const [reasonCodes, setReasonCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = (code: string) => setReasonCodes(rc => rc.includes(code) ? rc.filter(c => c !== code) : [...rc, code]);

  const doTransition = async (to: SubmissionStatus, action: string, extra: Partial<PIASubmission> = {}) => {
    setBusy(true);
    try {
      const patch: Partial<PIASubmission> = { status: to, admin_notes: notes || null, ...extra };
      const { error } = await updateSubmissionStatus(s.id, patch);
      if (error) throw error;
      await recordReview({ submission_id: s.id, action, from_status: s.status, to_status: to, reason_codes: reasonCodes, notes });
      await logActivity({ action: `submission_${action}`, submission_id: s.id, agent_id: s.agent_id, details: { from: s.status, to } });
      if (agent) {
        const msg = to === "changes_requested" ? "Admin has requested changes to your submission."
          : to === "rejected" ? "Your submission was rejected."
          : to === "under_review" ? "Your submission is now under review."
          : to === "approved" ? "Your submission was approved."
          : to === "suspended" ? "Your submission was suspended."
          : "Submission updated.";
        await notifyUser(agent.id, `Submission: ${s.name}`, msg, "/product-agent");
      }
      toast.success("Updated");
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  };

  const doPublish = async () => {
    setBusy(true);
    try {
      const { error } = await publishSubmission(s.id);
      if (error) throw error;
      await recordReview({ submission_id: s.id, action: "publish", from_status: s.status, to_status: "live", notes });
      await logActivity({ action: "submission_publish", submission_id: s.id, agent_id: s.agent_id });
      if (agent) await notifyUser(agent.id, `Product published: ${s.name}`, "Your product is now live on Meridian Express.", "/product-agent");
      toast.success("Published to catalog");
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally { setBusy(false); }
  };

  const doReject = async () => {
    if (!reason.trim()) return toast.error("Please provide a rejection reason");
    await doTransition("rejected", "reject", { rejection_reason: reason, resubmission_allowed: true } as never);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl bg-card border border-border shadow-lg my-8" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{s.name}</h3>
            <p className="text-xs text-muted-foreground">Submitted by {agent?.full_name} · {s.agent_code}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <Info label="Category" value={s.category} />
            <Info label="Subcategory" value={s.subcategory} />
            <Info label="Brand" value={s.brand} />
            <Info label="Model" value={s.model} />
            <Info label="Condition" value={s.condition} />
            <Info label="Warranty" value={s.warranty} />
            <Info label="Supplier price" value={s.supplier_price ? `KSh ${Number(s.supplier_price).toLocaleString("en-KE")}` : null} />
            <Info label="Proposed selling" value={s.proposed_selling_price ? `KSh ${Number(s.proposed_selling_price).toLocaleString("en-KE")}` : null} />
            <Info label="Stock" value={s.stock != null ? `${s.stock} (${s.stock_status})` : null} />
            <Info label="Min order qty" value={s.min_order_qty} />
            <Info label="Delivery" value={s.delivery_available ? `Yes · ${s.delivery_locations || ""}` : "No"} />
          </div>
          {s.description && <div><div className="text-xs uppercase text-muted-foreground">Description</div><div className="text-sm whitespace-pre-wrap">{s.description}</div></div>}
          {s.specifications && <div><div className="text-xs uppercase text-muted-foreground">Specifications</div><div className="text-sm whitespace-pre-wrap">{s.specifications}</div></div>}
          {s.agent_notes && <div><div className="text-xs uppercase text-muted-foreground">Agent notes</div><div className="text-sm">{s.agent_notes}</div></div>}
          {(s.main_image || (s.images && s.images.length > 0)) && (
            <div className="grid grid-cols-3 gap-2">
              {[s.main_image, ...(s.images || [])].filter(Boolean).map((img, i) => (
                <img key={i} src={img as string} alt="" className="rounded-md border border-border object-cover aspect-square" />
              ))}
            </div>
          )}
          <div>
            <div className="text-xs uppercase text-muted-foreground">Reason codes (for changes requested / rejection)</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {REASON_CODES.map(c => (
                <button key={c} type="button" onClick={() => toggle(c)}
                  className={`rounded-full px-3 py-1 text-xs border ${reasonCodes.includes(c) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Admin notes (visible to agent)</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Rejection reason (if rejecting)</span>
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="p-5 border-t border-border flex flex-wrap gap-2 justify-end">
          {s.status !== "under_review" && <Button variant="outline" onClick={() => doTransition("under_review", "start_review")} disabled={busy}>Start Review</Button>}
          <Button variant="outline" onClick={() => doTransition("changes_requested", "request_changes")} disabled={busy}>Request Changes</Button>
          <Button variant="outline" onClick={doReject} disabled={busy}>Reject</Button>
          <Button variant="outline" onClick={() => doTransition("suspended", "suspend")} disabled={busy}>Suspend</Button>
          <Button variant="outline" onClick={() => doTransition("approved", "approve", { approved_at: new Date().toISOString() } as never)} disabled={busy}>Approve</Button>
          <Button onClick={doPublish} disabled={busy || !!s.published_product_id}>{s.published_product_id ? "Already Published" : "Approve & Publish"}</Button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return <div><div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div><div>{value}</div></div>;
}

type ActivityRow = { id: string; action: string; actor_id: string | null; agent_id: string | null; submission_id: string | null; supplier_id: string | null; details: unknown; created_at: string };
function PIAActivityList() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("pia_activity_log" as never).select("*").order("created_at", { ascending: false }).limit(200);
      setRows((data as ActivityRow[]) || []);
    })();
  }, []);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border"><h3 className="font-semibold">Activity History</h3><p className="text-xs text-muted-foreground">Most recent 200 events.</p></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3 text-left">When</th><th className="px-4 py-3 text-left">Action</th><th className="px-4 py-3 text-left">Details</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="text-center py-10 text-muted-foreground">No activity yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.details ? JSON.stringify(r.details) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Referral Agents (simple referral-code tracking)
// ─────────────────────────────────────────────────────────────
type RefAgent = {
  id: string; name: string; phone: string; code: string;
  active: boolean; created_at: string; updated_at: string;
};

function ReferralAgentsTab({ orders }: { orders: Order[] }) {
  const [rows, setRows] = useState<RefAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<RefAgent | null>(null);
  const [showForm, setShowForm] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("referral_agents" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(((data as unknown) as RefAgent[]) || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const ordersByCode = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      if (!o.referral_code) continue;
      const k = o.referral_code.toUpperCase();
      const arr = map.get(k) ?? [];
      arr.push(o);
      map.set(k, arr);
    }
    return map;
  }, [orders]);

  const toggleActive = async (r: RefAgent) => {
    const { error } = await supabase
      .from("referral_agents" as never)
      .update({ active: !r.active } as never)
      .eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success(!r.active ? "Activated" : "Deactivated"); refresh(); }
  };
  const remove = async (r: RefAgent) => {
    if (!confirm(`Delete referral agent ${r.name}?`)) return;
    const { error } = await supabase.from("referral_agents" as never).delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  const exportXlsx = () => {
    const rowsOut: Record<string, string | number>[] = [];
    for (const o of orders) {
      if (!o.referral_code) continue;
      const code = o.referral_code.toUpperCase();
      const ag = rows.find((r) => r.code.toUpperCase() === code);
      rowsOut.push({
        Date: new Date(o.created_at).toLocaleString("en-KE"),
        "Customer Name": o.customer_name || "",
        "Customer Phone": o.customer_phone || "",
        "Referral Code": code,
        "Agent Name": ag?.name || o.agent_name || "",
        "Agent Phone": ag?.phone || "",
        "Products Ordered": (o.items || []).map((i) => `${i.name} x${i.qty}`).join("; "),
        "Total Amount": o.total,
        "Order Status": o.status,
      });
    }
    const ws = XLSX.utils.json_to_sheet(rowsOut);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Referrals");
    XLSX.writeFile(wb, `meridian-referrals-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <SectionHeader eyebrow="Referral Agents" title="Manage Agent Referral Codes" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportXlsx}><Download className="h-4 w-4 mr-1.5" /> Export Referrals (.xlsx)</Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4 mr-1.5" /> Add Agent</Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or code"
          className="w-full rounded-md border border-border bg-secondary pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Referrals</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (<tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>)}
            {!loading && filtered.length === 0 && (<tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No referral agents yet.</td></tr>)}
            {filtered.map((r) => {
              const ords = ordersByCode.get(r.code.toUpperCase()) ?? [];
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.phone}</td>
                  <td className="px-4 py-3 font-mono uppercase">{r.code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${r.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {r.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{ords.length}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(r)}>{r.active ? "Deactivate" : "Activate"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ReferralAgentForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function ReferralAgentForm({ initial, onClose, onSaved }: { initial: RefAgent | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !phone.trim() || !code.trim()) { toast.error("Name, phone, and code are required"); return; }
    setSaving(true);
    const payload = { name: name.trim(), phone: phone.trim(), code: code.trim().toUpperCase(), active };
    const { error } = initial
      ? await supabase.from("referral_agents" as never).update(payload as never).eq("id", initial.id)
      : await supabase.from("referral_agents" as never).insert(payload as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(initial ? "Updated" : "Added");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-background border border-border p-5 shadow-hover" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl">{initial ? "Edit Referral Agent" : "Add Referral Agent"}</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Agent Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Referral Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm font-mono uppercase" placeholder="e.g. AGENT001" />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
