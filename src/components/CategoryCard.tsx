import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import metalWorksAsset from "@/assets/images/metalworks.jpg";
import exUkAsset from "@/assets/images/ex-uk-products-catalog.jpg";
import clothingAsset from "@/assets/images/cat-clothing.jpg";
import gardeningAsset from "@/assets/images/cat-urban-gardening.jpg";
import refrigerationAsset from "@/assets/images/cat-refrigeration.jpg";
import beddingAsset from "@/assets/images/cat-bedding.jpg";
import industrialAsset from "@/assets/images/cat-industrial-products.jpg";
import { getCatalogProducts } from "@/lib/products";

const FALLBACK = metalWorksAsset;

export function coverForCategory(slug: string): string {
  // Dedicated catalog image for EX UK Products.
  if (slug === "ex-uk-products") return exUkAsset;
  if (slug === "clothing") return clothingAsset;
  if (slug === "urban-gardening-products") return gardeningAsset;
  if (slug === "refrigeration-products") return refrigerationAsset;
  if (slug === "bedding-and-bed-products") return beddingAsset;
  if (slug === "industrial-products") return industrialAsset;

  const products = getCatalogProducts();
  // Direct category match — use first product with a valid image.
  const direct = products.find((p) => p.category === slug && p.image);
  if (direct) return direct.image;
  // Special virtual categories.
  if (slug === "new-arrivals") {
    const sorted = [...products].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    if (sorted[0]?.image) return sorted[0].image;
  }
  if (slug === "best-sellers" || slug === "financing-available") {
    const featured = products.find((p) => p.featured && p.image);
    if (featured) return featured.image;
  }
  return FALLBACK;
}

export function CategoryCard({
  slug, name, description, index = 0,
}: { slug: string; name: string; description: string; index?: number }) {
  const cover = coverForCategory(slug);
  return (
    <Link
      to="/shop"
      search={{ category: slug } as never}
      className="group relative block overflow-hidden rounded-2xl bg-secondary animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      <div className="aspect-[4/5] overflow-hidden">
        <img
          src={cover}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <h3 className="font-display text-2xl tracking-tight">{name}</h3>
        <p className="mt-1 text-xs text-white/80 line-clamp-2">{description}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] opacity-90 group-hover:gap-2 transition-all">
          Explore <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
