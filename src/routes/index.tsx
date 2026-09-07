import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Truck, MessageSquare, ShoppingBag, Wrench, ShieldCheck, Tag, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { CategoryBubbleRow } from "@/components/CategoryBubbleRow";
import { RecommendedGrid } from "@/components/RecommendedGrid";
import { CATEGORIES, getCatalogProducts, categoryName, getVisibleCategories } from "@/lib/products";
import { waLink, PHONE_DISPLAY } from "@/lib/store";
import { WhatsAppChannelCTA } from "@/components/WhatsAppChannelCTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meridian Express — Shop Quality Kamukunji-Made Products" },
      { name: "description", content: "Durable, affordable, locally fabricated items delivered with speed and trust across Kenya." },
      { property: "og:title", content: "Meridian Express" },
      { property: "og:description", content: "Shop Quality Kamukunji-Made Products. Delivered Fast." },
    ],
  }),
  component: Home,
});

function Home() {
  const PRODUCTS = getCatalogProducts();
  const featured = PRODUCTS.filter((p) => p.featured);
  const popular = PRODUCTS.slice(0, 8);
  const sectionCats = CATEGORIES.filter((c) => PRODUCTS.some((p) => p.category === c.slug));
  const visibleCats = getVisibleCategories();
  const recommended = PRODUCTS.slice(0, 12);
  return (
    <div>
      {/* Hero banner */}
      <section className="relative overflow-hidden text-white" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24 grid gap-10 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.25em]">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Kamukunji · Made in Kenya
            </span>
            <h1 className="mt-5 font-display text-5xl md:text-7xl leading-[1.02] tracking-tight text-balance">
              Quality Kamukunji-Made <span className="italic" style={{ color: "oklch(0.78 0.18 25)" }}>Products</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/85 max-w-xl">
              Durable fabricated items for homes, businesses, and institutions — delivered fast across Kenya.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-white text-foreground px-7 py-3.5 text-sm font-semibold hover:bg-accent hover:text-white transition-colors">
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={waLink("Hello Meridian Express, I'd like to make an order.")}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white"
                style={{ background: "oklch(0.62 0.17 150)" }}
              >
                <WhatsAppIcon className="h-4 w-4" /> Order on WhatsApp
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-xs text-white/70">
              <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4" /> Fast delivery</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Trusted artisans</span>
              <span className="inline-flex items-center gap-2"><Tag className="h-4 w-4" /> Direct-from-maker prices</span>
            </div>
          </div>
          <div className="lg:col-span-5 relative animate-scale-in">
            <div className="grid grid-cols-2 gap-3">
              {featured.slice(0, 4).map((p, i) => (
                <Link key={p.id} to="/product/$id" params={{ id: p.id }} className={`relative overflow-hidden rounded-2xl ${i === 0 || i === 3 ? "aspect-square" : "aspect-square"}`}>
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform hover:scale-105 duration-700" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-[11px] font-medium text-white line-clamp-1">{p.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Service strip */}
      <section className="border-b hairline bg-card">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { i: MessageSquare, t: "Live Chat Support", d: "Mon–Sat, fast replies" },
            { i: ShoppingBag, t: "Order Now", d: "Cart or WhatsApp" },
            { i: Truck, t: "Fast Delivery", d: "Countrywide options" },
            { i: Wrench, t: "Custom Orders", d: "Made to your spec" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="grid h-11 w-11 place-items-center rounded-xl text-white shrink-0" style={{ background: "var(--navy)" }}>
                <s.i className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{s.t}</p>
                <p className="text-xs text-muted-foreground">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular products */}
      <section className="bg-secondary border-y hairline">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-14 md:py-20">
          <div className="flex items-end justify-between gap-4 mb-8">
            <SectionHeader eyebrow="Marketplace" title="Featured Products" subtitle="Browse selected kitchen equipment, food vending products, catering tools, and business equipment from Meridian Express." />
            <Link to="/shop" className="hidden md:inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-accent hover:text-primary">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </div>
      </section>

      {/* Categories quick grid */}
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-14 md:py-20">
        <SectionHeader eyebrow="Browse" title="Shop by Category" subtitle="Find what you need across our fabricated product range." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleCats.map((c, i) => <CategoryCard key={c.slug} {...c} index={i} />)}
        </div>
      </section>

      {/* Jumia-style quick-category bubbles + dense recommendations, in Meridian navy/red */}
      <section className="bg-secondary border-y hairline">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-12 md:py-16">
          <CategoryBubbleRow categories={visibleCats} />
          <div className="mt-10 flex items-end justify-between gap-4 mb-5">
            <SectionHeader eyebrow="Just For You" title="Recommended for You" subtitle="Picked from across our full catalogue." />
            <Link to="/shop" className="hidden md:inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-accent hover:text-primary shrink-0">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <RecommendedGrid products={recommended} />
        </div>
      </section>

      {/* WhatsApp Channel CTA */}
      <WhatsAppChannelCTA />

      {/* Per-category sections */}
      {sectionCats.map((cat) => {
        const items = PRODUCTS.filter((p) => p.category === cat.slug).slice(0, 4);
        if (items.length === 0) return null;
        return (
          <section key={cat.slug} className="mx-auto max-w-7xl px-5 md:px-8 py-12 md:py-16">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-accent font-semibold">Category</span>
                <h2 className="mt-2 font-display text-2xl md:text-4xl tracking-tight">{cat.name}</h2>
              </div>
              <Link to="/shop" search={{ category: cat.slug } as never} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs uppercase tracking-[0.18em] font-medium hover:border-primary hover:text-primary transition">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        );
      })}

      {/* Bottom CTA */}
      <section className="relative overflow-hidden mt-6">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24">
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-14 text-white" style={{ background: "var(--gradient-hero)" }}>
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-30" style={{ background: "var(--accent)" }} />
            <div className="relative grid gap-10 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7">
                <span className="text-[11px] uppercase tracking-[0.3em] text-white/80">Bulk · Wholesale · Institutional</span>
                <h2 className="mt-3 font-display text-3xl md:text-5xl tracking-tight text-balance">Industrial & Commercial Hardware Solutions</h2>
                <ul className="mt-6 grid sm:grid-cols-2 gap-y-2.5 gap-x-6 text-sm text-white/85">
                  {["Durable Equipment", "Affordable Pricing", "Delivery Support", "Custom Orders Available"].map((b) => (
                    <li key={b} className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> {b}</li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-white text-foreground px-6 py-3 text-sm font-semibold hover:bg-accent hover:text-white transition">Shop <ArrowRight className="h-4 w-4" /></Link>
                  <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition"><Phone className="h-4 w-4" /> Contact Us</Link>
                </div>
              </div>
              <div className="lg:col-span-5 grid grid-cols-3 gap-3">
                {PRODUCTS.slice(2, 8).map((p) => (
                  <div key={p.id} className="aspect-square overflow-hidden rounded-xl">
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp */}
      <a href={waLink("Hello Meridian Express!")} target="_blank" rel="noreferrer" aria-label="WhatsApp"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-hover hover:scale-105 transition"
        style={{ background: "oklch(0.62 0.17 150)" }}>
        <WhatsAppIcon className="h-5 w-5" /> <span className="hidden sm:inline">Chat</span>
      </a>
    </div>
  );
}
