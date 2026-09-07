import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, FileText, MapPin, Mail } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { formatKES, categoryName, type Product } from "@/lib/products";
import { useCart, useAuth, logWhatsAppOrder, logEmailOrder, mailtoOrderLink, WHATSAPP_NUMBER } from "@/lib/store";
import { toast } from "sonner";
import { useState } from "react";
import { PhoneCaptureModal } from "@/components/PhoneCaptureModal";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [orderChannel, setOrderChannel] = useState<"whatsapp" | "email" | null>(null);

  const onNonWa = () => {
    if (!user) {
      toast.message("Please create an account or log in to place and track a non-WhatsApp order.");
      nav({ to: "/auth" });
      return;
    }
    add(product.id);
    nav({ to: "/cart" });
  };
  const onWaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setOrderChannel("whatsapp");
  };
  const onEmailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setOrderChannel("email");
  };
  const onPhoneConfirm = ({ phone, name, referralCode, referralAgent }: { phone: string; name: string; referralCode: string | null; referralAgent: { name: string; phone: string; code: string } | null }) => {
    const channel = orderChannel;
    setOrderChannel(null);
    const customerName = name || user?.name;
    const logInput = {
      items: [{ id: product.id, name: product.name, qty: 1, price: product.price, subtotal: product.price }],
      total: product.price,
      customer: { name: customerName, phone, email: user?.email, accountType: user?.accountType ?? "guest" },
      referralCode: referralAgent ? referralAgent.code : (referralCode ?? null),
      agentName: referralAgent?.name ?? null,
      agentPhone: referralAgent?.phone ?? null,
    };
    const orderDetails =
      `Product: ${product.name}\n` +
      `Category: ${categoryName(product.category)}\n` +
      `Price: KSh ${product.price.toLocaleString("en-KE")}\n` +
      `Quantity: 1\n` +
      `Order Type: ${channel === "email" ? "Email Order" : "WhatsApp Order"}`;
    const refBlock = referralAgent
      ? `Referral Code: ${referralAgent.code}\nReferred By: ${referralAgent.name}\nAgent Phone Number: ${referralAgent.phone}\n`
      : "";
    const msg =
      `Hello Meridian Express,\n\n` +
      `I would like to continue with my order.\n\n` +
      `Customer Name: ${customerName || "-"}\n` +
      `Customer Phone: ${phone}\n` +
      refBlock +
      `\nOrder Details:\n${orderDetails}\n\n` +
      `Please send me the availability and next steps.`;
    if (channel === "email") {
      logEmailOrder(logInput);
      window.location.href = mailtoOrderLink(`Order: ${product.name}`, msg);
    } else {
      logWhatsAppOrder(logInput);
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    }
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
            onClick={onWaClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-white text-sm font-semibold shadow-hover transition hover:opacity-90"
            style={{ background: "oklch(0.62 0.17 150)" }}
          >
            <WhatsAppIcon className="h-4 w-4" /> Order with WhatsApp
          </button>
          <button
            type="button"
            onClick={onEmailClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-hover transition hover:opacity-90 text-white"
            style={{ background: "var(--navy)" }}
          >
            <Mail className="h-4 w-4" /> Order by Email
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
      <PhoneCaptureModal
        open={orderChannel !== null}
        onClose={() => setOrderChannel(null)}
        onConfirm={onPhoneConfirm}
        confirmLabel={orderChannel === "email" ? "Continue to Email" : "Continue to WhatsApp"}
        defaultName={user?.name ?? ""}
        defaultPhone={user?.phone ?? ""}
      />
    </article>
  );
}
