import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/products";

const PRODUCTS_BUCKET = "products";

export type StoreCategory = { slug: string; name: string };

type DbProductRow = {
  id: string;
  title: string;
  price_kes: number;
  description_short: string | null;
  description_long: string | null;
  availability: string;
  county: string | null;
  created_at: string;
  category_id: string | null;
};
type DbCategoryRow = { id: string; slug: string; name: string; active: boolean };
type DbImageRow = { product_id: string; storage_path: string; is_primary: boolean };

function imageUrl(path: string): string {
  return supabase.storage.from(PRODUCTS_BUCKET).getPublicUrl(path).data.publicUrl;
}

function mapToProduct(row: DbProductRow, categorySlug: string, image: string | undefined): Product {
  return {
    id: row.id,
    name: row.title,
    category: categorySlug,
    price: row.price_kes,
    description: row.description_short || "",
    longDescription: row.description_long || undefined,
    image: image || "",
    availability: row.availability === "Made to Order" ? "Made to Order" : "In Stock",
    productStatus: "Active",
    seller: "Meridian Express",
    businessName: "Meridian Express",
    county: row.county || undefined,
    location: row.county || undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

/** Live (active) DB categories, for merging with the built-in CATEGORIES list. */
export async function fetchActiveDbCategories(): Promise<StoreCategory[]> {
  const { data, error } = await supabase
    .from("categories" as never)
    .select("slug,name,active")
    .eq("active", true);
  if (error || !data) return [];
  return (data as unknown as DbCategoryRow[]).map((c) => ({ slug: c.slug, name: c.name }));
}

/** Live (approved) DB products, mapped into the app's shared Product shape. */
export async function fetchApprovedDbProducts(): Promise<Product[]> {
  const [{ data: prods }, { data: cats }, { data: imgs }] = await Promise.all([
    supabase
      .from("products" as never)
      .select("id,title,price_kes,description_short,description_long,availability,county,created_at,category_id")
      .eq("status", "approved"),
    supabase.from("categories" as never).select("id,slug,name,active"),
    supabase.from("product_images" as never).select("product_id,storage_path,is_primary"),
  ]);
  if (!prods) return [];

  const catById = new Map<string, string>();
  for (const c of (cats as unknown as (DbCategoryRow & { id: string })[]) || []) catById.set(c.id, c.slug);

  const imageByProduct = new Map<string, string>();
  for (const im of (imgs as unknown as DbImageRow[]) || []) {
    if (!imageByProduct.has(im.product_id) || im.is_primary) {
      imageByProduct.set(im.product_id, imageUrl(im.storage_path));
    }
  }

  return (prods as unknown as DbProductRow[]).map((row) =>
    mapToProduct(
      row,
      row.category_id ? catById.get(row.category_id) ?? "new-arrivals" : "new-arrivals",
      imageByProduct.get(row.id),
    ),
  );
}

/** Look up a single live DB product by id — fallback when a product isn't in the hardcoded catalog. */
export async function fetchApprovedDbProductById(id: string): Promise<Product | null> {
  const { data: row } = await supabase
    .from("products" as never)
    .select("id,title,price_kes,description_short,description_long,availability,county,created_at,category_id")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (!row) return null;
  const r = row as unknown as DbProductRow;

  let categorySlug = "new-arrivals";
  if (r.category_id) {
    const { data: cat } = await supabase.from("categories" as never).select("slug").eq("id", r.category_id).maybeSingle();
    if (cat) categorySlug = (cat as unknown as { slug: string }).slug;
  }

  const { data: imgs } = await supabase.from("product_images" as never).select("storage_path,is_primary").eq("product_id", id);
  const imageRows = (imgs as unknown as DbImageRow[]) || [];
  const primary = imageRows.find((i) => i.is_primary) ?? imageRows[0];

  return mapToProduct(r, categorySlug, primary ? imageUrl(primary.storage_path) : undefined);
}
