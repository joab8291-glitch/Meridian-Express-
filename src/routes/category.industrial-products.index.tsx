import { createFileRoute } from "@tanstack/react-router";
import { IndustrialCategory } from "@/components/IndustrialCategory";

const TITLE = "Industrial Products & Machinery in Kenya | Meridian Express";
const DESC =
  "Shop industrial machinery, workshop equipment, commercial machines, power equipment, tools and professional industrial products from Meridian Express Kenya.";

export const Route = createFileRoute("/category/industrial-products/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <IndustrialCategory />,
});
