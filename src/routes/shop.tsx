import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search, X } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { CATEGORIES, categoryName, getCatalogProducts, getVisibleCategories } from "@/lib/products";
import { KENYA_COUNTIES, BUSINESS_TYPES } from "@/lib/kenya";
import { Combobox } from "@/components/Combobox";
import type { Product } from "@/lib/products";
import { fetchApprovedDbProducts, fetchActiveDbCategories, type StoreCategory } from "@/lib/catalog";
import type { BusinessProduct } from "@/lib/business";
import { useEffect } from "react";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Meridian Express Marketplace | EX-UK Products, Business Equipment & Fabrication Products in Kenya" },
      { name: "description", content: "Shop EX-UK products, business equipment, food vending trolleys, kitchen equipment, metal fabrication products, and marketplace items from trusted sellers on Meridian Express." },
      { name: "keywords", content: "EX-UK Products, EX-UK Products Kenya, second-hand UK products Kenya, imported UK products Kenya, Meridian Express Marketplace, business equipment Kenya, food vending trolleys Kenya, kitchen equipment Kenya, metal fabrication products Kenya, custom fabrication Kenya" },
      { property: "og:title", content: "Meridian Express Marketplace | EX-UK Products & Business Equipment" },
      { property: "og:description", content: "Explore EX-UK Products on Meridian Express Marketplace — imported UK items, business equipment, and quality marketplace listings from trusted sellers in Kenya." },
    ],
  }),
  validateSearch: searchSchema,
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [cat, setCat] = useState(search.category ?? "");
  const [sort, setSort] = useState<"new" | "low" | "high">("new");
  const [county, setCounty] = useState("");
  const [locQ, setLocQ] = useState("");
  const [btype, setBtype] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>(getCatalogProducts());
  const [dbCategories, setDbCategories] = useState<StoreCategory[]>([]);

  // Merge approved business-uploaded products from all known accounts (localStorage).
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("me_biz_products") || "[]") as BusinessProduct[];
      // Products now go live immediately on upload; show everything except explicit rejections.
      const visible = raw.filter((p) => p.status !== "rejected");
      const mapped: Product[] = visible.map((p) => {
        const disc = typeof p.discountAllowed === "number" ? p.discountAllowed : 10;
        const sellingPrice = Math.round(p.price * (1 + disc / 100));
        return {
        id: p.id,
        name: p.name,
        category: p.category || "new-arrivals",
        price: sellingPrice,
        basePrice: p.price,
        discountAllowed: disc,
        createdAt: p.createdAt,
        description: p.description,
        image: p.images[0] || "",
        availability: "In Stock",
        seller: p.businessName,
        location: p.location,
        county: p.county,
        exactLocation: p.exactLocation,
        businessType: p.businessType,
        businessName: p.businessName,
        };
      });
      setAllProducts([...getCatalogProducts(), ...mapped]);
    } catch { /* ignore */ }
  }, []);

  // Merge admin/PIA-published database products and categories.
  useEffect(() => {
    (async () => {
      const [dbProducts, cats] = await Promise.all([fetchApprovedDbProducts(), fetchActiveDbCategories()]);
      setDbCategories(cats);
      if (dbProducts.length > 0) {
        setAllProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const fresh = dbProducts.filter((p) => !existingIds.has(p.id));
          return [...prev, ...fresh];
        });
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const list = allProducts.filter((p) => {
      const haystack = [
        p.name,
        p.description,
        categoryName(p.category),
        p.businessType || "",
      ].join(" ").toLowerCase();
      const matchQ = !q || haystack.includes(q.toLowerCase());
      const matchC = !cat || p.category === cat;
      const matchCounty = !county || p.county === county;
      const matchLoc = !locQ || (p.exactLocation || p.location || "").toLowerCase().includes(locQ.toLowerCase());
      const matchBT = !btype || p.businessType === btype;
      return matchQ && matchC && matchCounty && matchLoc && matchBT;
    });
    if (sort === "low") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [q, cat, sort, county, locQ, btype, allProducts]);

  const visibleCategories = getVisibleCategories();
  const mergedCategories = [
    ...visibleCategories,
    ...dbCategories.filter((dc) => !visibleCategories.some((c) => c.slug === dc.slug)),
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-10">
      <SectionHeader eyebrow="Shop" title="All Products" subtitle="Browse quality Kamukunji-made items, ready to order." />
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Sidebar filters */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Search</h3>
            <div className="flex items-center rounded-full border border-border bg-secondary px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="ml-2 w-full bg-transparent text-sm outline-none" />
              {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Categories</h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <button onClick={() => setCat("")} className={`w-full text-left px-2 py-1.5 rounded ${cat === "" ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary"}`}>
                  All Products <span className="text-xs text-muted-foreground">({allProducts.length})</span>
                </button>
              </li>
              {mergedCategories.map((c) => {
                const n = allProducts.filter((p) => p.category === c.slug).length;
                return (
                  <li key={c.slug}>
                    <button onClick={() => setCat(c.slug)} className={`w-full text-left px-2 py-1.5 rounded ${cat === c.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary"}`}>
                      {c.name} <span className="text-xs text-muted-foreground">({n})</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Filter by Location</h3>
            <Combobox value={county} onChange={setCounty} options={KENYA_COUNTIES} placeholder="All counties — type to search…" />
            <input
              value={locQ}
              onChange={(e) => setLocQ(e.target.value)}
              placeholder="Search town, estate, street, building, or area"
              className="mt-2 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm"
            />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Filter by Business Type</h3>
            <Combobox value={btype} onChange={setBtype} options={BUSINESS_TYPES} placeholder="All business types — type to search…" />
          </div>
        </aside>

        {/* Results */}
        <div className="lg:col-span-9">
          <div className="flex items-center justify-between gap-4 mb-5 rounded-full border border-border bg-card px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">{filtered.length}</span> products</span>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as never)} className="rounded-full bg-secondary px-3 py-1.5 text-sm outline-none">
                <option value="new">Newest</option>
                <option value="low">Price: Low to High</option>
                <option value="high">Price: High to Low</option>
              </select>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No products match. <Link to="/shop" className="text-primary">Reset filters</Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
