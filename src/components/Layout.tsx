import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, Search, ShoppingBag, MapPin, X, User, Phone, Heart, Mail } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useAuth, useCart, waLink, PHONE_DISPLAY } from "@/lib/store";
import { getVisibleCategories } from "@/lib/products";
import { WHATSAPP_CHANNEL_URL, WHATSAPP_CHANNEL_CTA_TEXT } from "@/lib/pricing";
import logoAsset from "@/assets/images/meridian-logo.png";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/categories", label: "Categories" },
  { to: "/shop", label: "Shop" },
  { to: "/category/industrial-products", label: "Industrial" },
  { to: "/about", label: "About" },
  { to: "/whatsapp-channel", label: "WhatsApp Channel" },
  { to: "/contact", label: "Contact" },
  { to: "/join-our-team", label: "Join Our Team" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");
  const { count } = useCart();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/shop?q=${encodeURIComponent(q)}`;
  };

  return (
    <header className={`sticky top-0 z-50 w-full transition-all ${scrolled ? "shadow-card" : ""}`}>
      {/* Utility bar */}
      <div className="hidden md:block text-white" style={{ background: "var(--navy)" }}>
        <div className="mx-auto max-w-7xl px-5 md:px-8 h-9 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-5 opacity-90">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Deliver to Nairobi, Kenya</span>
            <a href={`tel:${PHONE_DISPLAY}`} className="inline-flex items-center gap-1.5 hover:text-white"><Phone className="h-3.5 w-3.5" /> {PHONE_DISPLAY}</a>
            <a href={waLink("Hello Meridian Express!")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-white"><WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp Support</a>
          </div>
          <div className="flex items-center gap-4 opacity-90">
            <Link to={user ? "/dashboard" : "/auth"} className="hover:text-white">{user ? `Hi, ${user.name.split(" ")[0]}` : "Sign in / Register"}</Link>
            <span className="opacity-50">|</span>
            <Link to="/cart" className="hover:text-white">Cart ({count})</Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="bg-background/95 backdrop-blur border-b hairline">
        <div className="mx-auto max-w-7xl px-5 md:px-8 h-16 md:h-20 flex items-center gap-4 md:gap-8">
          <button className="md:hidden -ml-1 p-2" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/" className="shrink-0 flex items-center gap-2">
            <img src={logoAsset} alt="Meridian Express" className="h-8 md:h-10 w-auto" />
            <span className="flex items-baseline gap-1">
              <span className="font-display text-2xl md:text-3xl tracking-tight" style={{ color: "var(--navy)" }}>Meridian</span>
              <span className="font-display text-2xl md:text-3xl text-accent">Express</span>
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={submit} className="hidden md:flex flex-1 max-w-2xl items-center rounded-full border border-border bg-secondary focus-within:border-primary transition">
            <Search className="h-4 w-4 text-muted-foreground ml-4" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, categories…"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" className="rounded-full bg-primary px-5 py-2 text-xs font-medium uppercase tracking-wider text-primary-foreground hover:opacity-90 transition">Search</button>
          </form>

          <div className="flex items-center gap-1 ml-auto">
            <button className="md:hidden p-2" onClick={() => setOpen(true)} aria-label="Search"><Search className="h-5 w-5" /></button>
            <Link to="/cart" aria-label="Wishlist" className="hidden md:inline-flex p-2 hover:text-accent transition"><Heart className="h-5 w-5" /></Link>
            <Link to={user ? "/dashboard" : "/auth"} className="hidden md:inline-flex p-2 hover:text-primary transition" aria-label="Account"><User className="h-5 w-5" /></Link>
            <Link to="/cart" className="relative inline-flex items-center gap-2 rounded-full bg-foreground text-background px-3 md:px-4 py-2 text-sm font-medium hover:bg-primary transition">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden md:inline">Cart</span>
              {count > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">{count}</span>
              )}
            </Link>
          </div>
        </div>

        {/* Category nav */}
        <nav className="hidden md:block border-t hairline">
          <div className="mx-auto max-w-7xl px-5 md:px-8 flex items-center gap-1 h-11">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "text-accent" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                className="px-3 py-2 text-xs uppercase tracking-[0.18em] font-medium transition-colors"
              >
                {n.label}
              </Link>
            ))}
            <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.62_0.17_150)]" /> Online Support</span>
              <a href={waLink("Hello Meridian Express!")} target="_blank" rel="noreferrer" className="hover:text-accent">Order on WhatsApp →</a>
            </div>
          </div>
        </nav>
      </div>

      {open && (
        <div className="md:hidden border-t hairline bg-background animate-fade-in">
          <div className="flex flex-col p-4 gap-1">
            <form onSubmit={submit} className="mb-2 flex items-center rounded-full border border-border bg-secondary px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="flex-1 bg-transparent px-2 text-sm outline-none" />
            </form>
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="px-2 py-3 font-display text-lg border-b hairline">{n.label}</Link>
            ))}
            <Link to={user ? "/dashboard" : "/auth"} className="px-2 py-3 font-display text-lg border-b hairline">
              {user ? "My Account" : "Sign in"}
            </Link>
            <a
              href={waLink("Hello Meridian Express!")}
              target="_blank" rel="noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-white"
              style={{ background: "oklch(0.62 0.17 150)" }}
            >
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 text-white" style={{ background: "var(--navy)" }}>
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset} alt="Meridian Express" className="h-10 w-auto" />
            <span className="flex items-baseline gap-1">
              <span className="font-display text-3xl tracking-tight">Meridian</span>
              <span className="font-display text-3xl" style={{ color: "oklch(0.7 0.2 25)" }}>Express</span>
            </span>
          </Link>
          <p className="mt-4 text-sm text-white/70 max-w-xs">
            Premium Kamukunji-made and hardware products for homes, businesses and institutions across Kenya.
          </p>
          <a
            href={waLink("Hello Meridian Express!")} target="_blank" rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white"
            style={{ background: "oklch(0.62 0.17 150)" }}
          >
            <WhatsAppIcon className="h-4 w-4" /> Chat on WhatsApp
          </a>
          <div className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs text-white/80">{WHATSAPP_CHANNEL_CTA_TEXT}</p>
            <a
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white"
              style={{ background: "oklch(0.62 0.17 150)" }}
            >
              <WhatsAppIcon className="h-4 w-4" /> Join WhatsApp Channel
            </a>
          </div>
        </div>
        {[
          { title: "Our Company", links: [["Home", "/"], ["About Us", "/about"], ["FAQs", "/contact"], ["Contact Us", "/contact"]] },
          { title: "Shop", links: [["Shop Now", "/shop"], ["All Categories", "/categories"], ["View Cart", "/cart"], ["Wishlist", "/cart"]] },
          { title: "Our Customers", links: [["Reviews", "/about"], ["Blog", "/about"], ["Sign in", "/auth"], ["Create Account", "/auth"]] },
        ].map((col) => (
          <div key={col.title} className="md:col-span-2">
            <h4 className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-4">{col.title}</h4>
            <ul className="space-y-2.5 text-sm">
              {col.links.map(([label, to]) => (
                <li key={label}><Link to={to as string} className="text-white/85 hover:text-white">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
        <div className="md:col-span-2">
          <h4 className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-4">Contact Us</h4>
          <ul className="space-y-2.5 text-sm text-white/85">
            <li className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> Nairobi, Kenya</li>
            <li><a href={`tel:${PHONE_DISPLAY}`} className="inline-flex items-center gap-2 hover:text-white"><Phone className="h-4 w-4" /> {PHONE_DISPLAY}</a></li>
            <li><a href="mailto:info@meridianexpress.co.ke" className="inline-flex items-center gap-2 hover:text-white"><Mail className="h-4 w-4" /><span>info@meridianexpress.co.ke</span></a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-5 text-xs text-white/60 flex flex-col md:flex-row gap-2 items-center justify-between">
          <span>© {new Date().getFullYear()} Meridian Express. All rights reserved.</span>
          <span className="hidden md:flex gap-3 flex-wrap justify-end">
            {getVisibleCategories().slice(0, 5).map((c) => (
              <Link key={c.slug} to="/shop" search={{ category: c.slug } as never} className="hover:text-white">{c.name}</Link>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
