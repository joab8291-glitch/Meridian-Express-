// Lightweight localStorage-backed business store (products + orders).
// Keeps everything client-side to minimise credits.

export type BusinessProduct = {
  id: string;
  businessEmail: string;
  businessName: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  location: string;
  images: string[]; // data URLs
  createdAt: number;
  category?: string;          // category slug
  discountAllowed?: number;   // % allowed to Meridian Express (10-100)
  status?: "pending" | "approved" | "rejected";
  county?: string;
  exactLocation?: string;
  businessType?: string;
  /** Supplier sourcing details — internal/admin visible. */
  supplierName?: string;
  supplierPhone?: string;
  supplierLocation?: string;
};

export type BusinessOrderItem = {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
};

export type BusinessOrder = {
  id: string;
  businessEmail: string;
  businessName: string;
  customerName?: string;
  customerPhone?: string;
  items: BusinessOrderItem[];
  total: number;
  status: "pending" | "completed";
  createdAt: number;
};

const PRODUCTS_KEY = "me_biz_products";
const ORDERS_KEY = "me_biz_orders";

function readArr<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]") as T[]; } catch { return []; }
}
function writeArr<T>(key: string, v: T[]) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

/* Products */
export const listProducts = (email: string) =>
  readArr<BusinessProduct>(PRODUCTS_KEY).filter((p) => p.businessEmail === email);

export const addProduct = (p: Omit<BusinessProduct, "id" | "createdAt">) => {
  const all = readArr<BusinessProduct>(PRODUCTS_KEY);
  const item: BusinessProduct = { ...p, id: `bp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() };
  all.push(item);
  writeArr(PRODUCTS_KEY, all);
  return item;
};

export const deleteProduct = (id: string) => {
  writeArr(PRODUCTS_KEY, readArr<BusinessProduct>(PRODUCTS_KEY).filter((p) => p.id !== id));
};

/* Orders */
export const listOrders = (email: string) =>
  readArr<BusinessOrder>(ORDERS_KEY).filter((o) => o.businessEmail === email).sort((a, b) => b.createdAt - a.createdAt);

export const addOrder = (o: Omit<BusinessOrder, "id" | "createdAt" | "status"> & { status?: BusinessOrder["status"] }) => {
  const all = readArr<BusinessOrder>(ORDERS_KEY);
  const item: BusinessOrder = {
    ...o,
    status: o.status ?? "pending",
    id: `bo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  all.push(item);
  writeArr(ORDERS_KEY, all);
  return item;
};

export const updateOrderStatus = (id: string, status: BusinessOrder["status"]) => {
  writeArr(
    ORDERS_KEY,
    readArr<BusinessOrder>(ORDERS_KEY).map((o) => (o.id === id ? { ...o, status } : o)),
  );
};

/* Log an order against every distinct seller in the cart. Used at checkout. */
export const logCartOrders = (
  detailed: { product: { id: string; name: string; price: number; seller?: string }; qty: number; subtotal: number }[],
  customer?: { name?: string; phone?: string },
) => {
  // Map seller name -> business email (lookup from me_accounts so it routes to dashboards).
  let accounts: Record<string, { user: { email: string; business?: { name: string; email: string } } }> = {};
  try { accounts = JSON.parse(localStorage.getItem("me_accounts") || "{}"); } catch {}
  const sellerToEmail: Record<string, { email: string; name: string }> = {};
  Object.values(accounts).forEach((rec) => {
    const b = rec?.user?.business;
    if (b?.name) sellerToEmail[b.name] = { email: b.email, name: b.name };
  });

  const groups = new Map<string, { email: string; name: string; items: BusinessOrderItem[]; total: number }>();
  detailed.forEach(({ product, qty, subtotal }) => {
    const seller = product.seller || "Meridian Express";
    const owner = sellerToEmail[seller];
    if (!owner) return; // skip if seller isn't a registered business
    const g = groups.get(owner.email) || { email: owner.email, name: owner.name, items: [], total: 0 };
    g.items.push({ productId: product.id, productName: product.name, qty, unitPrice: product.price, subtotal });
    g.total += subtotal;
    groups.set(owner.email, g);
  });

  groups.forEach((g) => {
    addOrder({
      businessEmail: g.email,
      businessName: g.name,
      customerName: customer?.name,
      customerPhone: customer?.phone,
      items: g.items,
      total: g.total,
    });
  });
};

/* Analytics */
export const productStats = (email: string) => {
  const orders = listOrders(email);
  const map = new Map<string, { name: string; orders: number; units: number; revenue: number }>();
  orders.forEach((o) =>
    o.items.forEach((it) => {
      const cur = map.get(it.productId) || { name: it.productName, orders: 0, units: 0, revenue: 0 };
      cur.orders += 1;
      cur.units += it.qty;
      cur.revenue += it.subtotal;
      map.set(it.productId, cur);
    }),
  );
  return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
};

export const monthlyRevenue = (email: string) => {
  const orders = listOrders(email);
  const map = new Map<string, number>();
  orders.forEach((o) => {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) || 0) + o.total);
  });
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
};