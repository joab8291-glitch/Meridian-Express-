import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Package, User as UserIcon, Briefcase, Plus, Trash2, ChevronLeft, ChevronRight, LayoutDashboard, ShoppingBag, BarChart3, Check, Pencil } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { useAuth, useCart, waLink } from "@/lib/store";
import { formatKES } from "@/lib/products";
import { CATEGORIES } from "@/lib/products";
import { getCategoryIncrease, DEFAULT_CATEGORY_MARKUPS } from "@/lib/pricing";
import { KENYA_COUNTIES } from "@/lib/kenya";
import { Combobox } from "@/components/Combobox";
import {
  addProduct, deleteProduct, listProducts, listOrders, updateOrderStatus,
  productStats, monthlyRevenue, addOrder,
  type BusinessProduct,
} from "@/lib/business";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My Account — Meridian Express" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, logout } = useAuth();
  const { count, detailed } = useCart();
  const nav = useNavigate();
  useEffect(() => { if (!user) nav({ to: "/auth" }); }, [user, nav]);
  if (!user) return null;
  const isBusiness = user.accountType === "business" && !!user.business;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-3xl bg-gradient-hero text-white p-6 md:p-8 shadow-hover">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium capitalize">{user.accountType} account</span>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold">Hello, {user.name.split(" ")[0]} 👋</h1>
            <p className="text-white/85 text-sm mt-1">{user.email}{user.phone ? ` • ${user.phone}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isBusiness && (
              <Button variant="secondary" onClick={() => nav({ to: "/account-edit" })}><Pencil className="h-4 w-4" /> Edit Account</Button>
            )}
            <Button variant="secondary" onClick={() => { logout(); nav({ to: "/" }); }}><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
        </div>
      </div>

      {!isBusiness && (
      <>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card icon={Package} title="Cart Items" value={String(count)}>
          <Link to="/cart" className="text-sm text-primary hover:underline">View cart →</Link>
        </Card>
        <Card icon={UserIcon} title="My Orders" value="Track">
          <Link to="/my-orders" className="text-sm text-primary hover:underline">View Non-WhatsApp orders →</Link>
        </Card>
        <Card icon={WhatsAppIcon} title="Quick Order" value="WhatsApp">
          <a href={waLink(`Hello Meridian Express, this is ${user.name}.`)} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Chat now →</a>
        </Card>
      </div>
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="text-lg font-semibold">Your Cart</h3>
        {detailed.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No items yet. <Link to="/shop" className="text-primary">Start shopping</Link>.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {detailed.map(({ product, qty }) => (
              <li key={product.id} className="flex items-center gap-3 py-3">
                <img src={product.image} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1 text-sm"><div className="font-medium">{product.name}</div><div className="text-muted-foreground">Qty {qty}</div></div>
                <Link to="/product/$id" params={{ id: product.id }} className="text-sm text-primary hover:underline">View</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      </>
      )}

      {isBusiness && <BusinessPanel email={user.business!.email} name={user.business!.name} />}
    </div>
  );
}

function Card({ icon: Icon, title, value, children }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{title}</span>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/* ---------------- Business panel ---------------- */
type Tab = "overview" | "orders" | "products" | "revenue";

function BusinessPanel({ email, name }: { email: string; name: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [tick, setTick] = useState(0); // re-render after mutations
  const refresh = () => setTick((t) => t + 1);

  const products = useMemo(() => listProducts(email), [email, tick]);
  const orders = useMemo(() => listOrders(email), [email, tick]);
  const stats = useMemo(() => productStats(email), [email, tick]);
  const monthly = useMemo(() => monthlyRevenue(email), [email, tick]);
  const revenueTotal = orders.reduce((a, o) => a + o.total, 0);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "products", label: "Products", icon: Package },
    { id: "revenue", label: "Revenue", icon: BarChart3 },
  ];

  return (
    <div className="mt-6">
      <div className="flex gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 text-sm font-medium">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 transition whitespace-nowrap ${active ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Card icon={ShoppingBag} title="Total Orders" value={String(orders.length)}><span className="text-xs text-muted-foreground">All-time</span></Card>
          <Card icon={Package} title="Products" value={String(products.length)}><span className="text-xs text-muted-foreground">Listed</span></Card>
          <Card icon={BarChart3} title="Revenue" value={revenueTotal > 0 ? formatKES(revenueTotal) : "0"}><span className="text-xs text-muted-foreground">All-time</span></Card>
          <Card icon={Briefcase} title="Pending" value={String(orders.filter((o) => o.status === "pending").length)}><span className="text-xs text-muted-foreground">Awaiting action</span></Card>
        </div>
      )}

      {tab === "orders" && <OrdersTab email={email} businessName={name} products={products} onChange={refresh} orders={orders} />}
      {tab === "products" && <ProductsTab email={email} businessName={name} products={products} onChange={refresh} />}
      {tab === "revenue" && <RevenueTab stats={stats} monthly={monthly} />}
    </div>
  );
}

/* ---- Orders ---- */
function OrdersTab({ email, businessName, products, orders, onChange }: { email: string; businessName: string; products: BusinessProduct[]; orders: ReturnType<typeof listOrders>; onChange: () => void; }) {
  const [showLog, setShowLog] = useState(false);
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState(1);
  const [cname, setCname] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = products.find((x) => x.id === pid);
    if (!p) return toast.error("Pick a product");
    addOrder({
      businessEmail: email, businessName,
      customerName: cname || "Walk-in",
      items: [{ productId: p.id, productName: p.name, qty, unitPrice: p.price, subtotal: p.price * qty }],
      total: p.price * qty,
    });
    setShowLog(false); setPid(""); setQty(1); setCname("");
    toast.success("Order logged");
    onChange();
  };

  return (
    <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold">Orders</h3>
        <Button size="sm" onClick={() => setShowLog((v) => !v)}><Plus className="h-4 w-4" /> Log order</Button>
      </div>

      {showLog && (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-border bg-secondary/40 p-4 sm:grid-cols-4">
          <select value={pid} onChange={(e) => setPid(e.target.value)} required className="rounded-md border border-border bg-white px-3 py-2 text-sm sm:col-span-2">
            <option value="">Select a product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatKES(p.price)}</option>)}
          </select>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} className="rounded-md border border-border bg-white px-3 py-2 text-sm" />
          <input placeholder="Customer name" value={cname} onChange={(e) => setCname(e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm" />
          <Button type="submit" size="sm" className="sm:col-span-4">Add order</Button>
        </form>
      )}

      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No orders yet. Customer checkouts and manually-logged orders will appear here.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {orders.map((o) => (
            <li key={o.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{o.customerName || "Customer"} {o.customerPhone && <span className="text-muted-foreground font-normal">· {o.customerPhone}</span>}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">{formatKES(o.total)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${o.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{o.status}</span>
                  {o.status === "pending" && (
                    <button onClick={() => { updateOrderStatus(o.id, "completed"); onChange(); }} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Check className="h-3 w-3" /> Mark done</button>
                  )}
                </div>
              </div>
              <ul className="mt-1 text-xs text-muted-foreground">
                {o.items.map((it, i) => <li key={i}>• {it.productName} × {it.qty} — {formatKES(it.subtotal)}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---- Products ---- */
function ProductsTab({ email, businessName, products, onChange }: { email: string; businessName: string; products: BusinessProduct[]; onChange: () => void; }) {
  const { user } = useAuth();
  const biz = user?.business;
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ name: "", description: "", price: "", rating: "5", location: "", category: "", county: "", exactLocation: "", supplierName: "", supplierPhone: "", supplierLocation: "" });
  const [images, setImages] = useState<string[]>([]);

  // Derive Meridian Express markup % automatically from the selected category.
  // Suppliers no longer control this — see approved category price-increase range.
  const supplierPrice = parseInt(f.price) || 0;
  const autoMarkupPct = (getCategoryIncrease(f.category) ?? DEFAULT_CATEGORY_MARKUPS[f.category] ?? 15);
  const marginAmount = Math.round(supplierPrice * autoMarkupPct / 100);
  const finalSellingPrice = supplierPrice + marginAmount;

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr: string[] = [];
    for (const file of Array.from(files)) {
      const data = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(file); });
      arr.push(data);
    }
    setImages((cur) => [...cur, ...arr]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) return toast.error("Add at least one image");
    if (!f.category) return toast.error("Please select a product category before uploading your product.");
    if (!supplierPrice || supplierPrice <= 0) return toast.error("Please enter a valid supplier price.");
    if (finalSellingPrice <= supplierPrice) {
      return toast.error("The selling price must be higher than the supplier price. Please check the pricing calculation before uploading this product.");
    }
    if (!f.supplierName.trim()) return toast.error("Please enter the supplier name.");
    if (!f.supplierPhone.trim()) return toast.error("Please enter the supplier phone number.");
    if (!f.supplierLocation.trim()) return toast.error("Please enter the supplier location.");
    addProduct({
      businessEmail: email, businessName,
      name: f.name, description: f.description,
      price: parseInt(f.price) || 0,
      rating: Math.max(0, Math.min(5, parseFloat(f.rating) || 0)),
      location: f.exactLocation || f.location || biz?.exactLocation || biz?.location || "",
      category: f.category,
      discountAllowed: autoMarkupPct,
      status: "approved",
      images,
      county: f.county || biz?.county,
      exactLocation: f.exactLocation || biz?.exactLocation,
      businessType: biz?.businessType,
      supplierName: f.supplierName,
      supplierPhone: f.supplierPhone,
      supplierLocation: f.supplierLocation,
    });
    setF({ name: "", description: "", price: "", rating: "5", location: "", category: "", county: "", exactLocation: "", supplierName: "", supplierPhone: "", supplierLocation: "" });
    setImages([]); setShowForm(false);
    toast.success("Product is live on the marketplace");
    onChange();
  };

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add a product</h3>
          <Button size="sm" variant={showForm ? "secondary" : "default"} onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> {showForm ? "Close" : "New product"}
          </Button>
        </div>
        {showForm && (
          <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input required placeholder="Product name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm sm:col-span-2" />
            <select required value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm sm:col-span-2">
              <option value="">Select product category…</option>
              {CATEGORIES.filter((c) => c.slug !== "metal-works").map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <textarea required placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm sm:col-span-2 min-h-[90px]" />
            <input required type="number" min={0} placeholder="Supplier / Original Price (KES)" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
            <input required type="number" min={0} max={5} step={0.1} placeholder="Rating (0–5)" value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm" />
            <input required placeholder="Location" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm sm:col-span-2" />
            <label className="sm:col-span-1 block">
              <span className="text-xs text-muted-foreground">Product County (optional)</span>
              <div className="mt-1">
                <Combobox value={f.county} onChange={(v) => setF({ ...f, county: v })} options={KENYA_COUNTIES} placeholder={biz?.county ? `Defaults to ${biz.county}` : "Type to search counties…"} />
              </div>
            </label>
            <input placeholder="Enter exact product location if different from your business location" value={f.exactLocation} onChange={(e) => setF({ ...f, exactLocation: e.target.value })} className="rounded-md border border-border bg-secondary px-3 py-2 text-sm sm:col-span-1" />
            <div className="sm:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Pricing summary</div>
              <div className="mt-2 grid gap-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Supplier Price</span><span className="font-medium">{formatKES(supplierPrice)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Platform Price Increase ({autoMarkupPct}%)</span><span className="font-medium">{formatKES(marginAmount)}</span></div>
                <div className="flex justify-between border-t border-border pt-1"><span className="text-muted-foreground">Final Meridian Express Selling Price</span><span className="font-bold text-primary">{formatKES(finalSellingPrice)}</span></div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">The platform price increase is applied automatically using the approved category range. Suppliers cannot adjust this.</p>
            </div>
            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3">
              <div className="sm:col-span-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supplier Details (internal)</div>
              <input required placeholder="Enter supplier name" value={f.supplierName} onChange={(e) => setF({ ...f, supplierName: e.target.value })} className="rounded-md border border-border bg-white px-3 py-2 text-sm" />
              <input required placeholder="Enter supplier phone number" value={f.supplierPhone} onChange={(e) => setF({ ...f, supplierPhone: e.target.value })} className="rounded-md border border-border bg-white px-3 py-2 text-sm" />
              <input required placeholder="Enter supplier location" value={f.supplierLocation} onChange={(e) => setF({ ...f, supplierLocation: e.target.value })} className="rounded-md border border-border bg-white px-3 py-2 text-sm" />
            </div>
            <label className="sm:col-span-2 rounded-md border border-dashed border-border bg-secondary px-3 py-4 text-sm cursor-pointer text-center">
              <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} className="hidden" />
              {images.length === 0 ? "Click to add images (multiple)" : `${images.length} image(s) selected — click to add more`}
            </label>
            {images.length > 0 && (
              <div className="sm:col-span-2 flex gap-2 overflow-x-auto">
                {images.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} className="h-16 w-16 rounded-md object-cover" />
                    <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 rounded-full bg-destructive text-white p-0.5"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <Button type="submit" className="sm:col-span-2">Submit product for review</Button>
          </form>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-lg font-semibold">Your products ({products.length})</h3>
        {products.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No products yet. Add your first product above.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => <ProductTile key={p.id} product={p} onDelete={() => { deleteProduct(p.id); onChange(); }} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductTile({ product, onDelete }: { product: BusinessProduct; onDelete: () => void }) {
  const [idx, setIdx] = useState(0);
  // Auto-scroll images
  useEffect(() => {
    if (product.images.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % product.images.length), 2500);
    return () => clearInterval(t);
  }, [product.images.length]);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-white">
      <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
        {product.images.map((src, i) => (
          <img key={i} src={src} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${i === idx ? "opacity-100" : "opacity-0"}`} />
        ))}
        {product.images.length > 1 && (
          <>
            <button onClick={() => setIdx((i) => (i - 1 + product.images.length) % product.images.length)} className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setIdx((i) => (i + 1) % product.images.length)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white"><ChevronRight className="h-4 w-4" /></button>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
              {product.images.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/50"}`} />)}
            </div>
          </>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-tight">{product.name}</h4>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-bold text-primary">{formatKES(product.price)}</span>
          <span className="text-xs text-muted-foreground">★ {product.rating.toFixed(1)} · {product.location}</span>
        </div>
        {(product.category || product.discountAllowed) && (
          <div className="mt-2 space-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
            {product.category && <div>Category: <span className="text-foreground">{product.category}</span></div>}
            {typeof product.discountAllowed === "number" && (
              <>
                <div>Supplier Price: <span className="text-foreground">{formatKES(product.price)}</span></div>
                <div>Platform Price Increase: <span className="text-foreground">{product.discountAllowed}% ({formatKES(Math.round(product.price * product.discountAllowed / 100))})</span></div>
                <div>Final Selling Price: <span className="text-foreground">{formatKES(Math.round(product.price * (1 + product.discountAllowed / 100)))}</span></div>
              </>
            )}
            {(product.supplierName || product.supplierPhone || product.supplierLocation) && (
              <div className="pt-1 border-t border-border/60">
                <div className="font-semibold text-foreground">Supplier</div>
                {product.supplierName && <div>{product.supplierName}</div>}
                {product.supplierPhone && <div>{product.supplierPhone}</div>}
                {product.supplierLocation && <div>{product.supplierLocation}</div>}
              </div>
            )}
            {product.status && <div>Status: <span className="text-foreground capitalize">{product.status}</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Revenue ---- */
function RevenueTab({ stats, monthly }: { stats: ReturnType<typeof productStats>; monthly: ReturnType<typeof monthlyRevenue> }) {
  const max = Math.max(1, ...monthly.map(([, v]) => v));
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-lg font-semibold">Per-product performance</h3>
        {stats.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No sales yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr><th className="text-left py-1">Product</th><th className="text-right">Orders</th><th className="text-right">Units</th><th className="text-right">Revenue</th></tr></thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.id} className="border-t border-border"><td className="py-2">{s.name}</td><td className="text-right">{s.orders}</td><td className="text-right">{s.units}</td><td className="text-right font-medium">{formatKES(s.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-lg font-semibold">Revenue by month</h3>
        {monthly.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No revenue yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {monthly.map(([k, v]) => (
              <li key={k}>
                <div className="flex justify-between text-sm"><span>{k}</span><span className="font-medium">{formatKES(v)}</span></div>
                <div className="h-2 mt-1 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
