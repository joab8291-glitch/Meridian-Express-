import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Tag, Bell } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_CHANNEL_URL, WHATSAPP_CHANNEL_CTA_TEXT } from "@/lib/pricing";

export const Route = createFileRoute("/whatsapp-channel")({
  head: () => ({
    meta: [
      { title: "Join Meridian Express WhatsApp Channel" },
      { name: "description", content: WHATSAPP_CHANNEL_CTA_TEXT },
      { property: "og:title", content: "Join Meridian Express WhatsApp Channel" },
      { property: "og:description", content: WHATSAPP_CHANNEL_CTA_TEXT },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WhatsAppChannelPage,
});

function WhatsAppChannelPage() {
  const green = "oklch(0.62 0.17 150)";
  return (
    <div className="mx-auto max-w-3xl px-5 md:px-8 py-16 md:py-24">
      <div className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-card text-center">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white"
          style={{ background: green }}
        >
          <WhatsAppIcon className="h-8 w-8" />
        </div>
        <span className="mt-5 inline-block text-[10px] uppercase tracking-[0.3em] font-semibold" style={{ color: green }}>
          Meridian Express · WhatsApp Channel
        </span>
        <h1 className="mt-3 font-display text-3xl md:text-5xl tracking-tight" style={{ color: "var(--navy)" }}>
          Join Our WhatsApp Channel
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
          Join our channel for new arrivals, deals, and Meridian Express updates. Be the first to see new
          products, special offers, marketplace updates, and business equipment deals from Meridian Express.
        </p>

        <a
          href={WHATSAPP_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-full px-7 py-4 text-base font-semibold text-white shadow-hover hover:opacity-90 transition"
          style={{ background: green }}
        >
          <WhatsAppIcon className="h-5 w-5" /> Join WhatsApp Channel
        </a>

        <div className="mt-10 grid gap-4 sm:grid-cols-3 text-left">
          {[
            { i: Sparkles, t: "New Arrivals", d: "Be first to see products just added." },
            { i: Tag, t: "Special Deals", d: "Offers and price drops shared in channel." },
            { i: Bell, t: "Updates", d: "Marketplace and business equipment news." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-background p-4">
              <f.i className="h-5 w-5" style={{ color: green }} />
              <p className="mt-2 text-sm font-semibold">{f.t}</p>
              <p className="text-xs text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
