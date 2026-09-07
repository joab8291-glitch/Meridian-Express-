import type { Product } from "./products";

export const WHATSAPP_CHANNEL_URL =
  "https://whatsapp.com/channel/0029VbDB83rD38CMGh3NSk0E";
export const WHATSAPP_CHANNEL_CTA_TEXT =
  "Join our channel for new arrivals, deals, and Meridian Express updates.";

export const AGENT_COMMISSION_RATE = 0.4;

/** Default category-based markup percentages (admin can override in Settings). */
export const DEFAULT_CATEGORY_MARKUPS: Record<string, number> = {
  "kitchen-equipment": 20,
  "catering-equipment": 18,
  "food-display-equipment": 20,
  "snack-equipment": 22,
  "bakery-equipment": 20,
  "cooking-utensils": 10,
  "kitchen-utensils": 10,
  "food-service-equipment": 18,
  "traditional-cooking-equipment": 15,
  "metal-works": 15,
  "metal-fabrication-products": 15,
  "custom-fabrication": 15,
  "restaurant-equipment": 20,
  "business-equipment": 18,
  "storage-display-units": 18,
  "home-outdoor": 15,
};

const CATEGORY_MARKUPS_KEY = "me_category_markups";

function readCategoryOverrides(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(CATEGORY_MARKUPS_KEY) || "{}"); }
  catch { return {}; }
}

export function getCategoryMarkups(): Record<string, number> {
  return { ...DEFAULT_CATEGORY_MARKUPS, ...readCategoryOverrides() };
}

export function saveCategoryMarkup(slug: string, percent: number) {
  if (typeof window === "undefined") return;
  const all = readCategoryOverrides();
  all[slug] = percent;
  window.localStorage.setItem(CATEGORY_MARKUPS_KEY, JSON.stringify(all));
}

/** Returns the % increase configured for a category, or null if none. */
export function getCategoryIncrease(slug: string | undefined): number | null {
  if (!slug) return null;
  const map = getCategoryMarkups();
  return typeof map[slug] === "number" ? map[slug] : null;
}

/**
 * Products excluded from automatic markup — Food Vending Trolleys keep
 * their manually curated price.
 */
export function isPriceExempt(p: Pick<Product, "id" | "category" | "name">): boolean {
  if (p.category === "food-vending-trolleys") return true;
  if (p.category === "books") return true;
  if (p.id?.startsWith("trolley-")) return true;
  if (/food\s*vending\s*trolley/i.test(p.name ?? "")) return true;
  return false;
}

/** Legacy tiered fallback markup — used only when a category has no configured %. */
export function applySellingMarkup(originalPrice: number): number {
  if (!originalPrice || originalPrice <= 0) return 0;
  if (originalPrice <= 10_000) return Math.round(originalPrice * 1.3);
  if (originalPrice <= 30_000) return Math.round(originalPrice * 1.25);
  return originalPrice;
}

export function computeSellingPrice(p: Pick<Product, "id" | "category" | "name" | "price">): number {
  if (isPriceExempt(p)) return p.price;
  if (!p.price || p.price <= 0) return 0;
  const pct = getCategoryIncrease(p.category);
  if (pct != null) return Math.round(p.price * (1 + pct / 100));
  return applySellingMarkup(p.price);
}

/** Effective % applied for a product (0 when exempt or no price). */
export function effectiveIncreasePercent(p: Pick<Product, "id" | "category" | "name" | "price">): number {
  if (isPriceExempt(p) || !p.price || p.price <= 0) return 0;
  const pct = getCategoryIncrease(p.category);
  if (pct != null) return pct;
  if (p.price <= 10_000) return 30;
  if (p.price <= 30_000) return 25;
  return 0;
}

/** Meridian Express revenue = selling - original. */
export function computeRevenue(sellingPrice: number, originalPrice: number): number {
  return Math.max(0, Math.round((sellingPrice ?? 0) - (originalPrice ?? 0)));
}

export function computeAgentCommission(revenue: number): number {
  return Math.round(revenue * AGENT_COMMISSION_RATE);
}