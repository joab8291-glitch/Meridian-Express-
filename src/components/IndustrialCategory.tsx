import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { ProductCard } from "@/components/ProductCard";
import { getCatalogProducts, INDUSTRIAL_SUBCATEGORIES } from "@/lib/products";
import { WHATSAPP_NUMBER } from "@/lib/store";
import industrialAsset from "@/assets/images/cat-industrial-products.jpg";

export const INDUSTRIAL_SLUG = "industrial-products";

export const subSlug = (name: string) =>
  name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const waLink = (msg: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

function QuoteForm({ subcategory }: { subcategory?: string }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", company: "", product: "", qty: "1", location: "", message: "" });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg =
      `Hello Meridian Express, I would like to request a quote for Industrial Products.\n\n` +
      `Name: ${f.name}\nPhone: ${f.phone}\n` +
      (f.email ? `Email: ${f.email}\n` : "") +
      (f.company ? `Company: ${f.company}\n` : "") +
      (subcategory ? `Subcategory: ${subcategory}\n` : "") +
      `Product: ${f.product}\nQuantity: ${f.qty}\nDelivery Location: ${f.location}\n` +
      (f.message ? `Requirements: ${f.message}\n` : "");
    window.open(waLink(msg), "_blank", "noopener");
  };
  const input = "w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-card">
      <h2 className="font-display text-2xl tracking-tight">Request a Quote</h2>
      <p className="mt-1 text-sm text-muted-foreground">For machinery and high-value equipment, send us your requirements and we will get back to you.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input required className={input} placeholder="Customer name" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <input required className={input} placeholder="Phone number" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        <input className={input} placeholder="Email (optional)" value={f.email} onChange={(e) => set("email", e.target.value)} />
        <input className={input} placeholder="Company name (optional)" value={f.company} onChange={(e) => set("company", e.target.value)} />
        <input required className={input} placeholder="Product / equipment" value={f.product} onChange={(e) => set("product", e.target.value)} />
        <input required className={input} placeholder="Quantity" value={f.qty} onChange={(e) => set("qty", e.target.value)} />
        <input required className={`${input} sm:col-span-2`} placeholder="Delivery location" value={f.location} onChange={(e) => set("location", e.target.value)} />
        <textarea rows={3} className={`${input} sm:col-span-2`} placeholder="Message / requirements" value={f.message} onChange={(e) => set("message", e.target.value)} />
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Send Quote Request
        </button>
        <a
          href={waLink("Hello Meridian Express, I would like to request a quote for an Industrial Products item. Please send me price, availability and delivery information.")}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
        >
          <WhatsAppIcon className="h-4 w-4" /> Request Quote via WhatsApp
        </a>
      </div>
    </form>
  );
}

export function IndustrialCategory({ subcategory }: { subcategory?: string }) {
  const products = useMemo(
    () => getCatalogProducts().filter((p) => p.category === INDUSTRIAL_SLUG),
    [],
  );

  return (
    <div className="w-full overflow-x-hidden">
      {/* Hero */}
      <section className="relative">
        <img
          src={industrialAsset}
          alt="Industrial machinery and workshop equipment"
          width={1280}
          height={960}
          className="h-[300px] md:h-[440px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/25" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-5 md:px-8 text-white">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/70">Industrial Machinery • Professional Equipment • Commercial Solutions</span>
            <h1 className="mt-3 font-display text-3xl md:text-6xl tracking-tight">{subcategory ?? "Industrial Products"}</h1>
            <p className="mt-2 text-sm md:text-lg text-white/90">Reliable Industrial Equipment for Businesses, Workshops &amp; Production</p>
            <p className="mt-3 max-w-2xl text-xs md:text-sm text-white/75">
              Explore industrial machinery, workshop equipment, commercial processing machines, power equipment, tools,
              material-handling solutions and other professional equipment for businesses across Kenya.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link
                to="/shop"
                search={{ category: INDUSTRIAL_SLUG } as never}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
              >
                Browse Industrial Products <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={waLink("Hello Meridian Express, I am interested in Industrial Products. Please send me more information about price, availability and delivery.")}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
                style={{ background: "oklch(0.62 0.17 150)" }}
              >
                <WhatsAppIcon className="h-4 w-4" /> Order via WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 md:px-8 py-10 space-y-10">
        {/* Subcategories */}
        <section>
          <h2 className="font-display text-2xl tracking-tight">Industrial Subcategories</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {INDUSTRIAL_SUBCATEGORIES.map((s) => (
              <Link
                key={s}
                to="/category/industrial-products/$sub"
                params={{ sub: subSlug(s) }}
                className={`rounded-full border px-4 py-2 text-xs md:text-sm transition ${
                  subcategory === s ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:bg-secondary"
                }`}
              >
                {s}
              </Link>
            ))}
          </div>
        </section>

        {/* Products */}
        <section>
          <h2 className="font-display text-2xl tracking-tight">Available Industrial Products</h2>
          {products.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              New industrial equipment listings are being added. Send us your requirements below or{" "}
              <a className="text-primary" href={waLink("Hello Meridian Express, I am interested in Industrial Products. Please send me more information about price, availability and delivery.")} target="_blank" rel="noopener">chat on WhatsApp</a>.
            </p>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </section>

        <QuoteForm subcategory={subcategory} />
      </div>
    </div>
  );
}
