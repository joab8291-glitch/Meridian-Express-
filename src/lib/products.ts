export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  /** Original supplier/base price before Meridian Express markup. */
  originalPrice?: number;
  size?: string;
  condition?: string;
  description: string;
  longDescription?: string;
  features?: string[];
  image: string;
  availability: "In Stock" | "Made to Order";
  featured?: boolean;
  productStatus?: "Active" | "Inactive";
  seller?: string;
  location?: string;
  county?: string;
  exactLocation?: string;
  businessType?: string;
  businessName?: string;
  /** Supplier/base price entered by the business (public price = basePrice + margin). */
  basePrice?: number;
  /** Discount-allowed % used to compute Meridian Express margin. */
  discountAllowed?: number;
  /** Date the product was first listed (epoch ms) — used for "New" filter. */
  createdAt?: number;
};

type ProductOverride = Partial<Product>;

const CATALOG_OVERRIDES_KEY = "me_catalog_overrides";

export const CATEGORIES = [
  { slug: "metal-works", name: "Metal Works", description: "Fabricated metal trolleys, frames and custom metal works from Kamukunji." },
  { slug: "food-vending-trolleys", name: "Food Vending Trolleys", description: "Mobile food vending trolleys for vendors and entrepreneurs." },
  { slug: "kitchen-equipment", name: "Kitchen Equipment", description: "Commercial and home kitchen equipment from trusted sellers." },
  { slug: "metal-fabrication-products", name: "Metal Fabrication Products", description: "Custom-fabricated metal products built to last." },
  { slug: "restaurant-equipment", name: "Restaurant Equipment", description: "Essential equipment for restaurants, cafes, and food businesses." },
  { slug: "food-display-equipment", name: "Food Display Equipment", description: "Display units, warmers and cases for cooked food and pastries." },
  { slug: "snack-equipment", name: "Snack Equipment", description: "Popcorn machines and other snack-making equipment." },
  { slug: "cooking-utensils", name: "Cooking Utensils", description: "Pots, ladles and everyday cooking utensils for homes and businesses." },
  { slug: "catering-equipment", name: "Catering Equipment", description: "Chafing dishes, inserts and equipment for catering and events." },
  { slug: "bakery-equipment", name: "Bakery Equipment", description: "Ovens, warmers and equipment for bakeries and food businesses." },
  { slug: "traditional-cooking-equipment", name: "Traditional Cooking Equipment", description: "Charcoal stoves, pots and traditional cooking equipment." },
  { slug: "kitchen-utensils", name: "Kitchen Utensils", description: "Bowls, pans and utensils for kitchens and food service." },
  { slug: "food-service-equipment", name: "Food Service Equipment", description: "Pans, inserts and equipment for serving and food service." },
  { slug: "home-outdoor", name: "Home & Outdoor", description: "Practical products for homes, gardens, and outdoor spaces." },
  { slug: "business-equipment", name: "Business Equipment", description: "Equipment to set up and grow your business in Kenya." },
  { slug: "storage-display-units", name: "Storage & Display Units", description: "Storage racks, shelves and display units for shops and stores." },
  { slug: "custom-fabrication", name: "Custom Fabrication", description: "Made-to-order fabrication for your unique specifications." },
  { slug: "new-arrivals", name: "New Arrivals", description: "Fresh products newly listed on the Meridian Express marketplace." },
  { slug: "best-sellers", name: "Best Sellers", description: "Our most popular products loved by customers across Kenya." },
  { slug: "financing-available", name: "Financing Available", description: "Products you can buy now and pay for in flexible installments." },
  { slug: "ex-uk-products", name: "EX-UK Products", description: "Imported UK items and quality second-hand UK products available in Kenya." },
  { slug: "clothing", name: "Clothing", description: "Men's, women's, and children's clothing, uniforms, workwear, shoes, and fashion accessories." },
  { slug: "urban-gardening-products", name: "Urban Gardening Products", description: "Planting containers, seedlings, gardening tools, watering equipment, vertical gardening, soil, fertilizers, and greenhouse products." },
  { slug: "refrigeration-products", name: "Refrigeration Products", description: "Commercial and display refrigerators, freezers, cold rooms, ice makers, beverage coolers, accessories and spare parts." },
  { slug: "books", name: "Books", description: "Business, entrepreneurship and practical guide books available for delivery across Kenya." },
  { slug: "bedding-and-bed-products", name: "Bedding and Bed Products", description: "Bedsheets, duvets, pillows, blankets, comforters, mattress protectors and other quality bedding products." },
  { slug: "industrial-products", name: "Industrial Products", description: "Industrial machinery, workshop equipment, power tools, generators, pumps, material handling and commercial processing equipment." },
];

/** Optional subcategories per category — extendable by admin later. */
export const INDUSTRIAL_SUBCATEGORIES = [
  "Industrial Machinery",
  "Manufacturing Equipment",
  "Workshop Tools & Equipment",
  "Welding Equipment",
  "Power Tools",
  "Air Compressors",
  "Generators & Power Equipment",
  "Pumps & Motors",
  "Construction Equipment",
  "Material Handling Equipment",
  "Packaging Machinery",
  "Food Processing Machinery",
  "Commercial Refrigeration Equipment",
  "Industrial Cleaning Equipment",
  "Safety & Protective Equipment",
  "Electrical Industrial Equipment",
  "Agricultural Machinery",
  "Spare Parts & Accessories",
  "Other Industrial Equipment",
] as const;

import trolleyRegular from "@/assets/images/trolley-small.jpg";
import trolleyMedium from "@/assets/images/trolley-regular.jpg";
import trolleyLarge from "@/assets/images/trolley-regular-plus.jpg";
import foodDisplayWarmer from "@/assets/images/food-display-warmer.jpg";
import prepTableShelves from "@/assets/images/stainless-steel-prep-table-with-shelves.jpg";
import threeShelfPrepTable from "@/assets/images/three-shelf-stainless-steel-kitchen-prep-table.jpg";
import workstationTable from "@/assets/images/stainless-steel-workstation-table.jpg";
import largeWorkTable from "@/assets/images/commercial-chips-cutter-machine.jpg";
import chipsCutterMachine from "@/assets/images/chips-cutter-alt.jpg";
import gasCooker from "@/assets/images/heavy-duty-commercial-gas-cooker.jpg";
import cerealBasketImg from "@/assets/images/cereal-basket.jpg";
import double6lFryerImg from "@/assets/images/double-6l-fryer.jpg";
import fourGasCookerImg from "@/assets/images/four-gas-cooker.jpg";
import glassDisplayBoxImg from "@/assets/images/glass-display-box.jpg";
import ladleImg from "@/assets/images/ladle.jpg";
import largeFryerImg from "@/assets/images/large-fryer.jpg";
import glassBakeryDisplayImg from "@/assets/images/glass-bakery-display-cabinet.jpg";
import commercialBakingOvenImg from "@/assets/images/commercial-baking-oven.jpg";
import popcornMachineImg from "@/assets/images/popcorn-machine.jpg";
import singleStandingFryerImg from "@/assets/images/single-standing-fryer.jpg";
import charcoalStovePotImg from "@/assets/images/charcoal-stove-cooking-pot.jpg";
import doubleGasCookerImg from "@/assets/images/double-gas-cooker.jpg";
import doubleFryerImg from "@/assets/images/double-fryer.jpg";
import kitchenBowlPanSetImg from "@/assets/images/kitchen-bowl-pan-set.jpg";
import mindYourBusinessAsset from "@/assets/images/mind-your-business-book.jpg";
const mindYourBusinessImg = mindYourBusinessAsset;
import { computeSellingPrice } from "./pricing";

const SELLER = "Meridian Express";
const LOCATION = "Nairobi";
const COUNTY = "Nairobi City";
const EXACT = "Kamukunji";
const BTYPE = "Metal Fabrication Business";

export const PRODUCTS: Product[] = [
  {
    id: "trolley-regular",
    name: "MyExpress Regular Food Vending Trolley",
    category: "food-vending-trolleys",
    price: 8500,
    size: "Regular — 18 in × 23 in",
    condition: "New",
    description: "A compact and practical food-vending trolley designed for small businesses, mobile vendors, and entrepreneurs starting or expanding a food business.",
    longDescription: "The MyExpress Regular Food Vending Trolley is a compact fabricated trolley measuring 18 inches × 23 inches. It features a durable metal frame, clear product-display panels, a serving area, secure lower storage, and wheels for mobility. It is ideal for selling snacks, fruits, pastries, drinks, and other small food products in busy commercial locations.",
    image: trolleyRegular,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER,
    location: LOCATION,
    county: COUNTY,
    exactLocation: EXACT,
    businessType: BTYPE,
    businessName: SELLER,
  },
  {
    id: "trolley-medium",
    name: "MyExpress Medium Food Vending Trolley",
    category: "food-vending-trolleys",
    price: 12500,
    size: "Medium — 24 in × 23 in",
    condition: "New",
    description: "A spacious and reliable food-vending trolley offering more display and storage space for everyday commercial use.",
    longDescription: "The MyExpress Medium Food Vending Trolley measures 24 inches × 23 inches and provides a practical balance between mobility, display space, and storage. It features a strong fabricated metal frame, clear display panels, a serving surface, enclosed storage, and wheels for easy movement. It is suitable for vendors selling snacks, pastries, fruits, cooked food, drinks, and other products.",
    image: trolleyMedium,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER,
    location: LOCATION,
    county: COUNTY,
    exactLocation: EXACT,
    businessType: BTYPE,
    businessName: SELLER,
  },
  {
    id: "trolley-large",
    name: "MyExpress Large Food Vending Trolley",
    category: "food-vending-trolleys",
    price: 21500,
    size: "Large — 26 in × 25 in",
    condition: "New",
    description: "A large-capacity food-vending trolley designed for established vendors who require additional display, working, and storage space.",
    longDescription: "The MyExpress Large Food Vending Trolley measures 26 inches × 25 inches. It offers a broad display and serving area, durable metal fabrication, clear product-display panels, enclosed lower storage, and strong wheels for convenient movement. It is suitable for high-volume food vending, mobile retail businesses, catering businesses, and entrepreneurs operating in busy locations.",
    image: trolleyLarge,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER,
    location: LOCATION,
    county: COUNTY,
    exactLocation: EXACT,
    businessType: BTYPE,
    businessName: SELLER,
  },
  {
    id: "food-display-warmer-hot-food-display-unit",
    name: "Food Display Warmer / Hot Food Display Unit",
    category: "kitchen-equipment",
    price: 30000,
    condition: "New",
    description: "A professional hot food display unit suitable for displaying and keeping snacks, fast food, and ready-to-serve meals warm and presentable.",
    longDescription: "Ideal for restaurants, food vendors, cafés, hotels, snack shops, catering businesses, and other restaurant equipment setups. Designed for clean presentation, easy visibility, and professional food service while keeping food warm, organized, and ready to serve.",
    image: foodDisplayWarmer,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER,
    location: LOCATION,
    county: COUNTY,
    exactLocation: EXACT,
    businessType: "Restaurant Equipment",
    businessName: SELLER,
  },
  {
    id: "stainless-steel-prep-table-with-shelves",
    name: "Stainless-Steel Prep Table with Shelves",
    category: "kitchen-equipment",
    price: 18000,
    condition: "New",
    description: "Durable stainless-steel prep table with shelves for commercial kitchen preparation and storage.",
    longDescription: "Suitable for restaurants, butcheries, hotels, bakeries, catering businesses, food preparation areas, and business equipment spaces. Strong, easy to clean, hygienic, and designed for daily commercial use with extra shelf support.",
    image: prepTableShelves,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER,
    location: LOCATION,
    county: COUNTY,
    exactLocation: EXACT,
    businessType: "Kitchen Equipment Business",
    businessName: SELLER,
  },
  {
    id: "large-stainless-steel-work-table",
    name: "Large Stainless-Steel Work Table",
    category: "kitchen-equipment",
    price: 25000,
    condition: "New",
    description: "Large commercial stainless-steel work table for food preparation, kitchen organization, and heavy-duty use.",
    longDescription: "Built for professional kitchen environments that require a strong, hygienic, and spacious work surface. Ideal for food businesses, hotels, restaurants, catering setups, and other restaurant equipment or business equipment operations.",
    image: largeWorkTable,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER,
    location: LOCATION,
    county: COUNTY,
    exactLocation: EXACT,
    businessType: "Business Equipment",
    businessName: SELLER,
  },
  {
    id: "three-shelf-stainless-steel-kitchen-prep-table",
    name: "Three-Shelf Stainless-Steel Kitchen Prep Table",
    category: "kitchen-equipment",
    price: 22000,
    condition: "New",
    description: "Three-shelf stainless-steel kitchen prep table designed for preparation, storage, and organization.",
    longDescription: "Provides extra working and storage space for commercial kitchens. Suitable for food preparation, kitchen storage, equipment placement, organized workflow, restaurant equipment use, and growing business equipment setups.",
    image: threeShelfPrepTable,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER,
    location: LOCATION,
    county: COUNTY,
    exactLocation: EXACT,
    businessType: "Restaurant Equipment",
    businessName: SELLER,
  },
  {
    id: "stainless-steel-workstation-table",
    name: "Stainless-Steel Workstation Table",
    category: "kitchen-equipment",
    price: 15000,
    condition: "New",
    description: "Compact stainless-steel workstation table for food preparation, kitchen support, and business use.",
    longDescription: "A clean and practical workstation suitable for small restaurants, food vendors, cafés, catering businesses, and restaurant equipment needs. Easy to clean and suitable for everyday kitchen use in compact business equipment spaces.",
    image: workstationTable,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER,
    location: LOCATION,
    county: COUNTY,
    exactLocation: EXACT,
    businessType: "Kitchen Equipment Business",
    businessName: SELLER,
  },
  {
    id: "commercial-chips-cutter-machine",
    name: "Commercial Chips Cutter Machine",
    category: "kitchen-equipment",
    price: 8000,
    condition: "New",
    description: "Heavy-duty commercial chips cutter machine for fast and consistent potato cutting.",
    longDescription: "Suitable for chips businesses, restaurants, hotels, food kiosks, snack vendors, and restaurant equipment buyers. Designed to improve speed, consistency, and efficiency when preparing fries for commercial service.",
    image: chipsCutterMachine,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER,
    location: LOCATION,
    county: COUNTY,
    exactLocation: EXACT,
    businessType: "Business Equipment",
    businessName: SELLER,
  },
  {
    id: "heavy-duty-commercial-gas-cooker",
    name: "Heavy-Duty Commercial Gas Cooker",
    category: "kitchen-equipment",
    price: 28000,
    condition: "New",
    description: "Heavy-duty commercial gas cooker designed for professional cooking and high-volume food preparation.",
    longDescription: "Ideal for restaurants, hotels, catering businesses, food vendors, commercial kitchens, and restaurant equipment buyers. Built for strong heat output, durability, and reliable daily cooking in high-volume business environments.",
    image: gasCooker,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER,
    location: LOCATION,
    county: COUNTY,
    exactLocation: EXACT,
    businessType: "Restaurant Equipment",
    businessName: SELLER,
  },
  {
    id: "glass-display-box-with-inserts",
    name: "Glass Display Box with Inserts",
    category: "food-display-equipment",
    price: 14000,
    condition: "New",
    description: "Glass food display box with inserts, suitable for displaying cooked food, snacks, pastries, hotel meals, and food service items.",
    image: glassDisplayBoxImg,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Food Display Equipment", businessName: SELLER,
  },
  {
    id: "four-gas-cooker",
    name: "Four Gas Cooker",
    category: "kitchen-equipment",
    price: 3500,
    condition: "New",
    description: "Four gas cooker suitable for small kitchens, food vendors, restaurants, catering businesses, and everyday commercial cooking.",
    image: fourGasCookerImg,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Kitchen Equipment Business", businessName: SELLER,
  },
  {
    id: "large-fryer",
    name: "Single Standing Fryer",
    category: "kitchen-equipment",
    price: 0,
    condition: "New",
    description: "Single standing fryer suitable for chips, sausages, chicken, snacks, and other fried foods for small and medium food businesses.",
    image: singleStandingFryerImg,
    availability: "In Stock",
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Kitchen Equipment Business", businessName: SELLER,
  },
  {
    id: "double-6-litres-fryer",
    name: "Double Fryer",
    category: "kitchen-equipment",
    price: 0,
    condition: "New",
    description: "Commercial double fryer suitable for frying chips, chicken, sausages, snacks, and fast food items in food businesses and restaurants.",
    image: doubleFryerImg,
    availability: "In Stock",
    productStatus: "Active",
    featured: true,
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Kitchen Equipment Business", businessName: SELLER,
  },
  {
    id: "cereal-basket",
    name: "Cereal Basket",
    category: "kitchen-equipment",
    price: 0,
    condition: "New",
    description: "Cereal basket suitable for food storage, kitchen organization, hotels, restaurants, catering setups, and display use.",
    image: cerealBasketImg,
    availability: "In Stock",
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Kitchen Equipment Business", businessName: SELLER,
  },
  {
    id: "ladle",
    name: "Ladle",
    category: "cooking-utensils",
    price: 250,
    condition: "New",
    description: "Durable ladle suitable for serving soups, stews, sauces, porridge, and other foods in homes, hotels, restaurants, and catering businesses.",
    image: ladleImg,
    availability: "In Stock",
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Cooking Utensils", businessName: SELLER,
  },
  {
    id: "glass-bakery-food-display-cabinet",
    name: "Glass Bakery / Food Display Cabinet",
    category: "food-display-equipment",
    price: 6500,
    condition: "New",
    description: "Glass display cabinet suitable for displaying snacks, pastries, cakes, baked goods, and other food items in shops, bakeries, hotels, cafés, and food businesses.",
    image: glassBakeryDisplayImg,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Food Display Equipment", businessName: SELLER,
  },
  {
    id: "commercial-baking-oven-food-warmer",
    name: "Commercial Baking Oven / Food Warmer",
    category: "bakery-equipment",
    price: 12000,
    condition: "New",
    description: "Commercial oven or food warming cabinet suitable for bakeries, cafés, hotels, restaurants, and food businesses that need baking, warming, or holding equipment.",
    image: commercialBakingOvenImg,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Bakery Equipment", businessName: SELLER,
  },
  {
    id: "popcorn-machine",
    name: "Popcorn Machine",
    category: "snack-equipment",
    price: 7500,
    condition: "New",
    description: "Commercial popcorn machine suitable for events, shops, cinemas, schools, snack businesses, kiosks, and entertainment venues.",
    image: popcornMachineImg,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Snack Equipment", businessName: SELLER,
  },
  {
    id: "charcoal-stove-with-cooking-pot",
    name: "Charcoal Stove with Cooking Pot",
    category: "traditional-cooking-equipment",
    price: 650,
    condition: "New",
    description: "Traditional charcoal stove with cooking pot suitable for outdoor cooking, catering, events, and businesses that use charcoal-based cooking equipment.",
    image: charcoalStovePotImg,
    availability: "In Stock",
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Traditional Cooking Equipment", businessName: SELLER,
  },
  {
    id: "double-gas-cooker",
    name: "Single Gas Cooker",
    category: "kitchen-equipment",
    price: 15000,
    condition: "New",
    description: "Single gas cooker suitable for restaurants, food vendors, hotels, catering kitchens, and commercial cooking use.",
    image: doubleGasCookerImg,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Kitchen Equipment Business", businessName: SELLER,
  },
  {
    id: "stainless-steel-kitchen-bowl-and-food-pan-set",
    name: "Stainless Steel Kitchen Bowl and Food Pan Set",
    category: "kitchen-utensils",
    price: 2000,
    condition: "New",
    description: "Stainless steel kitchen bowl and food pan set suitable for food preparation, serving, storage, catering, restaurants, hotels, and commercial kitchens.",
    image: kitchenBowlPanSetImg,
    availability: "In Stock",
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: EXACT,
    businessType: "Kitchen Utensils", businessName: SELLER,
  },
  {
    id: "mind-your-business-book",
    name: "Mind Your Business",
    category: "books",
    price: 1000,
    condition: "New",
    description:
      "Mind Your Business by Njeru Karuana — a practical business guide on how to start and run a sustainable and profitable business. KSh 1,000 per copy, delivery available.",
    longDescription:
      "Mind Your Business – How to Start and Run a Sustainable & Profitable Business\n\nMind Your Business by Njeru Karuana is a practical business guide designed for entrepreneurs, aspiring business owners, and anyone interested in building and managing a sustainable and profitable enterprise.\n\nThe book simplifies the process of starting and running a business by explaining important areas such as integrating capital, people, assets, business operations, management procedures, and business planning. It provides practical knowledge that can help entrepreneurs understand how to structure, operate, and grow their businesses while reducing common business risks.\n\nIt is suitable for both new and existing entrepreneurs who want practical guidance on building stronger and more sustainable businesses.\n\nAuthor: Njeru Karuana\nPrice: KSh 1,000 per copy\nAvailability: In Stock – Unlimited Copies\nDelivery: Available",
    image: mindYourBusinessImg,
    availability: "In Stock",
    featured: true,
    productStatus: "Active",
    seller: SELLER, location: LOCATION, county: COUNTY, exactLocation: LOCATION,
    businessType: "Books & Publications", businessName: SELLER,
  },
];

function readOverrides(): Record<string, ProductOverride> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CATALOG_OVERRIDES_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveCatalogOverride(id: string, override: ProductOverride) {
  if (typeof window === "undefined") return;
  const all = readOverrides();
  all[id] = { ...(all[id] || {}), ...override };
  window.localStorage.setItem(CATALOG_OVERRIDES_KEY, JSON.stringify(all));
}

export function getAllCatalogProducts() {
  const overrides = readOverrides();
  return PRODUCTS.map((product) => {
    const merged = { ...product, ...(overrides[product.id] || {}) };
    const original = merged.price;
    const selling = computeSellingPrice(merged);
    return { ...merged, originalPrice: original, price: selling };
  });
}

export function getCatalogProducts() {
  return getAllCatalogProducts().filter((product) => product.productStatus !== "Inactive");
}

export const getProduct = (id: string) => getAllCatalogProducts().find((p) => p.id === id && p.productStatus !== "Inactive");
export const categoryName = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

/** Categories shown to customers: those with at least one active product, plus a few always-visible ones. */
const ALWAYS_VISIBLE_CATEGORIES = new Set([
  "ex-uk-products",
  "clothing",
  "urban-gardening-products",
  "refrigeration-products",
  "bedding-and-bed-products",
  "industrial-products",
]);
export function getVisibleCategories() {
  const products = getCatalogProducts();
  const slugsWithProducts = new Set(products.map((p) => p.category));
  return CATEGORIES.filter((c) => slugsWithProducts.has(c.slug) || ALWAYS_VISIBLE_CATEGORIES.has(c.slug));
}

export const formatKES = (n: number) => {
  if (!n || n <= 0 || Number.isNaN(n)) return "KSh 0";
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);
};
