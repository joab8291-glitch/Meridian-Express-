import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCatalogProducts, type Product, formatKES } from "./products";
import { supabase } from "@/integrations/supabase/client";

export const WHATSAPP_NUMBER = "254729044687";
export const PHONE_DISPLAY = "0729044687";
export const ORDER_EMAIL = "orders@meridianexpress.co.ke";

export const waLink = (msg: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

/** Build a pre-filled mailto: link for the "Order by Email" option. */
export const mailtoOrderLink = (subject: string, body: string) =>
  `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/* ---------- Cart ---------- */
type CartItem = { id: string; qty: number };
type CartCtx = {
  items: CartItem[];
  count: number;
  add: (id: string, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  total: number;
  detailed: { product: Product; qty: number; subtotal: number }[];
};
const Cart = createContext<CartCtx | null>(null);

/* ---------- Auth (localStorage only — saves credits) ---------- */
export type AccountType = "personal" | "business";
export type User = {
  email: string;
  name: string;
  phone?: string;
  accountType: AccountType;
  business?: {
    name: string;
    category: string;
    location: string;
    email: string;
    phone: string;
    county?: string;
    exactLocation?: string;
    businessType?: string;
    businessTypeOther?: string;
    /** Multi-select categories for the business (supersedes `category`). */
    businessCategories?: string[];
    /** Optional description shown on the public profile. */
    description?: string;
    /** Optional social media URL. */
    social?: string;
    /** Optional contact person name. */
    contactPerson?: string;
    /** Product Introducer referral code entered at signup (permanent link). */
    piReferralCode?: string;
  };
};
type AuthCtx = {
  user: User | null;
  signup: (u: User & { password: string }) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateBusiness: (b: NonNullable<User["business"]>) => void;
};
const Auth = createContext<AuthCtx | null>(null);

/**
 * Make sure a Supabase auth session exists for this customer email.
 * Customer credentials live in localStorage `me_accounts`; we mirror them
 * into Supabase Auth on demand so RLS-protected reads/writes (customer-owned
 * Non-WhatsApp orders) work without a separate sign-in flow.
 */
export async function ensureSupabaseSession(email: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email?.toLowerCase() === email.toLowerCase()) return user.id;
    const accounts = JSON.parse(localStorage.getItem("me_accounts") || "{}");
    const rec = accounts[email];
    if (!rec?.password) return null;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: rec.password });
    if (!error && data.user) return data.user.id;
    const { data: su } = await supabase.auth.signUp({ email, password: rec.password });
    if (su?.user) {
      const again = await supabase.auth.signInWithPassword({ email, password: rec.password });
      return again.data?.user?.id ?? su.user.id;
    }
    return null;
  } catch { return null; }
}

function useLS<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setV(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV] as const;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLS<CartItem[]>("me_cart", []);
  const [user, setUser] = useLS<User | null>("me_user", null);

  // Seed official Meridian Express business account (one-time)
  useEffect(() => {
    try {
      const accounts = JSON.parse(localStorage.getItem("me_accounts") || "{}");
      const email = "kevinkaruana@gmail.com";
      accounts[email] = {
        password: "meridian2026",
        user: {
          email,
          name: "Kevin Karuana",
          phone: "0707008020",
          accountType: "business",
          business: {
            name: "Meridian Express",
            category: "Metal Works",
            location: "Nairobi",
            email,
            phone: "0707008020",
            county: "Nairobi City",
            exactLocation: "Kamukunji",
            businessType: "Metal Fabrication Business",
          },
        },
      };
      localStorage.setItem("me_accounts", JSON.stringify(accounts));
    } catch {}
  }, []);

  const cart: CartCtx = {
    items,
    count: items.reduce((a, i) => a + i.qty, 0),
    add: (id, qty = 1) =>
      setItems((prev) => {
        const ex = prev.find((p) => p.id === id);
        return ex
          ? prev.map((p) => (p.id === id ? { ...p, qty: p.qty + qty } : p))
          : [...prev, { id, qty }];
      }),
    remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
    setQty: (id, qty) =>
      setItems((prev) =>
        qty <= 0 ? prev.filter((p) => p.id !== id) : prev.map((p) => (p.id === id ? { ...p, qty } : p)),
      ),
    clear: () => setItems([]),
    get detailed() {
      const products = getCatalogProducts();
      return items
        .map((i) => {
          const product = products.find((p) => p.id === i.id);
          return product ? { product, qty: i.qty, subtotal: product.price * i.qty } : null;
        })
        .filter(Boolean) as { product: Product; qty: number; subtotal: number }[];
    },
    get total() {
      const products = getCatalogProducts();
      return items.reduce((a, i) => {
        const p = products.find((x) => x.id === i.id);
        return a + (p ? p.price * i.qty : 0);
      }, 0);
    },
  };

  const auth: AuthCtx = {
    user,
    signup: ({ password: _pw, ...u }) => {
      // Demo only — credentials stored locally
      const accounts = JSON.parse(localStorage.getItem("me_accounts") || "{}");
      accounts[u.email] = { user: u, password: _pw };
      localStorage.setItem("me_accounts", JSON.stringify(accounts));
      setUser(u);
      supabase.auth.signUp({ email: u.email, password: _pw }).catch(() => {});
    },
    login: (email, password) => {
      const accounts = JSON.parse(localStorage.getItem("me_accounts") || "{}");
      const rec = accounts[email];
      if (rec && rec.password === password) {
        setUser(rec.user);
        supabase.auth.signInWithPassword({ email, password }).catch(() => {});
        return true;
      }
      return false;
    },
    logout: () => { setUser(null); supabase.auth.signOut().catch(() => {}); },
    updateBusiness: (b) => setUser((u) => (u ? { ...u, business: b } : u)),
  };

  return (
    <Auth.Provider value={auth}>
      <Cart.Provider value={cart}>{children}</Cart.Provider>
    </Auth.Provider>
  );
}

export const useCart = () => {
  const c = useContext(Cart);
  if (!c) throw new Error("useCart outside provider");
  return c;
};
export const useAuth = () => {
  const a = useContext(Auth);
  if (!a) throw new Error("useAuth outside provider");
  return a;
};

export const cartWhatsAppMessage = (items: { product: Product; qty: number; subtotal: number }[], total: number) => {
  const lines = items.map((i) => `• ${i.product.name} x${i.qty} — ${formatKES(i.subtotal)}`);
  return `Hello Meridian Express! I'd like to order:\n\n${lines.join("\n")}\n\nTotal: ${formatKES(total)}\n\nPlease confirm availability and delivery details.`;
};

export const cartEmailOrderBody = (items: { product: Product; qty: number; subtotal: number }[], total: number) => {
  const lines = items.map((i) => `- ${i.product.name} x${i.qty} — ${formatKES(i.subtotal)}`);
  return `Hello Meridian Express,\n\nI would like to order:\n\n${lines.join("\n")}\n\nTotal: ${formatKES(total)}\n\nPlease send me availability and next steps.`;
};

/**
 * Persist a WhatsApp order (single product or list) to the backend so it
 * always appears in the admin dashboard, even when the customer is redirected
 * straight to WhatsApp. Fire-and-forget — never blocks the wa.me redirect.
 */
export function logWhatsAppOrder(input: {
  items: { id: string; name: string; qty: number; price: number; subtotal: number }[];
  total: number;
  customer?: { name?: string; phone?: string; email?: string; accountType?: string };
  referralCode?: string | null;
  agentName?: string | null;
  agentPhone?: string | null;
}) {
  try {
    const payload = {
      customer_name: input.customer?.name ?? null,
      customer_phone: input.customer?.phone ?? null,
      customer_email: input.customer?.email ?? null,
      account_type: input.customer?.accountType ?? "guest",
      items: input.items,
      total: input.total,
      referral_code: input.referralCode ?? null,
      agent_name: input.agentName ?? null,
      order_type: "whatsapp",
      tracking_status: "order_received",
      status: "new",
    };
    supabase.from("sales_orders").insert(payload as never).then(() => {}, () => {});
  } catch {}
}

/**
 * Same as logWhatsAppOrder, but for the "Order by Email" path — persisted
 * with order_type "email" so it shows up in the admin dashboard alongside
 * WhatsApp orders. Fire-and-forget — never blocks the mailto: redirect.
 */
export function logEmailOrder(input: {
  items: { id: string; name: string; qty: number; price: number; subtotal: number }[];
  total: number;
  customer?: { name?: string; phone?: string; email?: string; accountType?: string };
  referralCode?: string | null;
  agentName?: string | null;
  agentPhone?: string | null;
}) {
  try {
    const payload = {
      customer_name: input.customer?.name ?? null,
      customer_phone: input.customer?.phone ?? null,
      customer_email: input.customer?.email ?? null,
      account_type: input.customer?.accountType ?? "guest",
      items: input.items,
      total: input.total,
      referral_code: input.referralCode ?? null,
      agent_name: input.agentName ?? null,
      order_type: "email",
      tracking_status: "order_received",
      status: "new",
    };
    supabase.from("sales_orders").insert(payload as never).then(() => {}, () => {});
  } catch {}
}
