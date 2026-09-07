import { createFileRoute } from "@tanstack/react-router";
import { CategoryCard } from "@/components/CategoryCard";
import { SectionHeader } from "@/components/SectionHeader";
import { getVisibleCategories } from "@/lib/products";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories — Meridian Express" }, { name: "description", content: "Explore Meridian Express product categories." }] }),
  component: () => {
    const cats = getVisibleCategories();
    return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <SectionHeader eyebrow="Browse" title="All Categories" subtitle="Pick a category to view products." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c, i) => <CategoryCard key={c.slug} {...c} index={i} />)}
      </div>
    </div>
    );
  },
});