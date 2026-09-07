import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Minus, Plus, MapPin, Store, Star, FileText, ShoppingCart } from "lucide-react";
import { categoryName, formatKES, getProduct } from "@/lib/products";
import { fetchApprovedDbProductById } from "@/lib/catalog";
import { useCart, useAuth } from "@/lib/store";
import { toast } from "sonner";
import { WhatsAppChannelCTA } from "@/components/WhatsAppChannelCTA";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const product = getProduct(params.id) ?? (await fetchApprovedDbProductById(params.id));
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.product
      ? [{ title: `${loaderData.product.name} — Meridian Express` }, { name: "description", content: loaderData.product.description }]
      : [{ title: "Product — Meridian Express" }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Product not found</h1>
      <Link to="/shop" className="mt-4 inline-block text-primary">Back to shop</Link>
    </div>
  ),
  errorComponent: () => <div className="px-4 py-20 text-center">Something went wrong.</div>,
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { add } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  const onNonWa = () => {
    if (!user) {
      toast.message("Please create an account or log in to place and track a non-WhatsApp order.");
      navigate({ to: "/auth" });
      return;
    }
    add(product.id, qty);
    navigate({ to: "/cart" });
  };
  const onAddToCart = () => {
    add(product.id, qty);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link to="/shop" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"><ChevronLeft className="h-4 w-4" /> Back to shop</Link>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl bg-secondary shadow-card animate-scale-in">
          <img src={product.image} alt={product.name} loading="lazy" className="w-full aspect-square object-contain bg-white" />
        </div>
        <div className="animate-slide-up">
          <span className="text-xs uppercase tracking-widest text-accent font-semibold">{categoryName(product.category)}</span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="mt-2 text-3xl font-bold" style={{ color: "var(--navy)" }}>{formatKES(product.price)}</p>
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5" /> No ratings yet
          </div>
          <p className="mt-1 text-sm" style={{ color: product.availability === "In Stock" ? "oklch(0.62 0.17 150)" : "var(--accent)" }}>
            {product.availability}
          </p>
          <p className="mt-4 text-muted-foreground">{product.description}</p>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {product.size && (
              <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Size</dt>
                <dd className="font-semibold">{product.size}</dd>
              </div>
            )}
            {product.condition && (
              <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Condition</dt>
                <dd className="font-semibold">{product.condition}</dd>
              </div>
            )}
            <div className="rounded-xl border border-border bg-card px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</dt>
              <dd className="font-semibold">{categoryName(product.category)}</dd>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1"><Store className="h-3 w-3" /> Seller</dt>
              <dd className="font-semibold">{product.seller ?? "Meridian Express"}</dd>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</dt>
              <dd className="font-semibold">{product.location ?? "Nairobi"}</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm font-medium">Quantity</span>
            <div className="inline-flex items-center rounded-full border border-border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center text-sm font-medium">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="p-2"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 max-w-md">
            <button
              type="button"
              onClick={onAddToCart}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold text-white shadow-hover transition hover:opacity-90"
              style={{ background: "var(--navy)" }}
            >
              <ShoppingCart className="h-5 w-5" /> Add to Cart
            </button>
            <button
              type="button"
              onClick={onNonWa}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary transition"
            >
              <FileText className="h-4 w-4" /> Non-WhatsApp Order
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Use this option if you want to track your order through your account.
            </p>
            <WhatsAppChannelCTA variant="inline" className="mt-2" />
          </div>
        </div>
      </div>

      {product.longDescription && (
        <div className="mt-12 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
          <h2 className="font-display text-2xl">Product Details</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">{product.longDescription}</p>
        </div>
      )}
    </div>
  );
}
