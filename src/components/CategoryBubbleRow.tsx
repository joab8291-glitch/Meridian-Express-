import { Link } from "@tanstack/react-router";
import { coverForCategory } from "@/components/CategoryCard";
import type { CATEGORIES } from "@/lib/products";

type Category = (typeof CATEGORIES)[number];

/**
 * A horizontal row of round category "bubbles" — the quick-browse pattern
 * seen on marketplace homepages (Jumia, Kilimall, etc.), restyled in
 * Meridian's navy/red palette instead of orange. Scrolls horizontally on
 * mobile, wraps into a grid on larger screens.
 */
export function CategoryBubbleRow({ categories }: { categories: Category[] }) {
  return (
    <div className="flex gap-5 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 sm:overflow-visible">
      {categories.map((c, i) => (
        <Link
          key={c.slug}
          to="/shop"
          search={{ category: c.slug } as never}
          className="group flex shrink-0 flex-col items-center gap-2 text-center animate-slide-up"
          style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}
        >
          <span
            className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 shadow-card transition-transform group-hover:-translate-y-1"
            style={{ borderColor: "var(--navy)" }}
          >
            <img
              src={coverForCategory(c.slug)}
              alt={c.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </span>
          <span className="w-20 text-[11px] font-medium leading-tight text-foreground line-clamp-2 group-hover:text-accent transition-colors">
            {c.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
