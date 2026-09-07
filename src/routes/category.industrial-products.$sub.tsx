import { createFileRoute } from "@tanstack/react-router";
import { IndustrialCategory, subSlug } from "@/components/IndustrialCategory";
import { INDUSTRIAL_SUBCATEGORIES } from "@/lib/products";

function nameFor(sub: string) {
  return INDUSTRIAL_SUBCATEGORIES.find((s) => subSlug(s) === sub);
}

export const Route = createFileRoute("/category/industrial-products/$sub")({
  head: ({ params }) => {
    const name = nameFor(params.sub) ?? "Industrial Equipment";
    const title = `${name} in Kenya | Meridian Express`;
    const description = `Shop ${name.toLowerCase()} and related industrial equipment for businesses, workshops and production in Kenya from Meridian Express.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: SubPage,
});

function SubPage() {
  const { sub } = Route.useParams();
  return <IndustrialCategory subcategory={nameFor(sub)} />;
}
