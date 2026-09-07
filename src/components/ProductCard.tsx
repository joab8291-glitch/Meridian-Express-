import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, FileText, MapPin, ShoppingCart } from "lucide-react";
import { formatKES, categoryName, type Product } from "@/lib/products";
import { useCart, useAuth } from "@/lib/store";
import { toast } from "sonner";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();

  const onNonWa = () => {
    if (!user) {
      toast.message("Please create an account or log in to place and track a non-WhatsApp order.");
      nav({ to: "/auth" });
      return;
    }
    add(product.id);
    nav({ to: "/cart" });
  };
  const onAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    add(product.id);
    toast.success(`${product.name} added to cart`);
  };
  return (
    <article
      className="group relative flex flex-col rounded-2xl bg-card border border-border overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-1 transition-all animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      <Link to="/product/$id" params={{ id: product.id }} className="relative block overflow-hidden bg-white aspect-square">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-contain p-3 transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute top-3 left-3 rounded-full bg-background/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground">
          {product.availability}
        </span>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); toast.success("Saved to wishlist"); }}
          className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-background/95 backdrop-blur text-foreground hover:text-accent transition"
          aria-label="Wishlist"
        >
          <Heart className="h-4 w-4" />
        </button>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold">{categoryName(product.category)}</span>
        <Link to="/product/$id" params={{ id: product.id }} className="mt-1.5 font-display text-lg leading-snug hover:text-primary transition-colors line-clamp-2 min-h-[3rem]">
          {product.name}
        </Link>
          {product.condition && <div className="mt-1 text-[11px] font-medium text-muted-foreground">Condition: {product.condition}</div>}
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-lg font-semibold" style={{ color: "var(--navy)" }}>{formatKES(product.price)}</span>
          {product.availability && <span className="text-[10px] text-muted-foreground">{product.availability}</span>}
        </div>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{product.description}</p>
        {(product.businessName || product.county || product.exactLocation || product.businessType) && (
          <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
            {product.businessName && <div>By <span className="text-foreground font-medium">{product.businessName}</span></div>}
            {(product.county || product.exactLocation) && (
              <div className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{[product.exactLocation, product.county].filter(Boolean).join(", ")}</div>
            )}
            {product.businessType && <div className="italic">{product.businessType}</div>}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAddToCart}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-white text-sm font-semibold shadow-hover transition hover:opacity-90"
            style={{ background: "var(--navy)" }}
          >
            <ShoppingCart className="h-4 w-4" /> Add to Cart
          </button>
          <button
            type="button"
            onClick={onNonWa}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition"
          >
            <FileText className="h-3.5 w-3.5" /> Non-WhatsApp Order
          </button>
          <span className="text-[10px] text-muted-foreground text-center leading-tight">
            Track your order by using Non-WhatsApp Order.
          </span>
        </div>
      </div>
    </article>
  );
}
