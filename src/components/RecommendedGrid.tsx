import { Link } from "@tanstack/react-router";
import { formatKES, categoryName, type Product } from "@/lib/products";

/**
 * A dense recommendations grid — the Jumia-style "Recommended for You"
 * pattern, restyled in Meridian's navy/red palette. Deliberately smaller
 * and tighter than the main ProductCard grid so it reads as a distinct,
 * denser section rather than a repeat of "Featured Products".
 */
export function RecommendedGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {products.map((p, i) => (
        <Link
          key={p.id}
          to="/product/$id"
          params={{ id: p.id }}
          className="group rounded-xl border border-border bg-card overflow-hidden shadow-card hover:shadow-hover transition animate-slide-up"
          style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}
        >
          <div className="aspect-square bg-white overflow-hidden">
            <img
              src={p.image}
              alt={p.name}
              loading="lazy"
              className="h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="p-2.5">
            <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "var(--accent)" }}>
              {categoryName(p.category)}
            </span>
            <p className="mt-0.5 text-[11.5px] font-semibold leading-snug line-clamp-2 min-h-[2.2em]">
              {p.name}
            </p>
            <p className="mt-1 text-sm font-bold" style={{ color: "var(--navy)" }}>
              {formatKES(p.price)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
