import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { WHATSAPP_CHANNEL_URL, WHATSAPP_CHANNEL_CTA_TEXT } from "@/lib/pricing";

type Props = {
  variant?: "card" | "inline" | "compact";
  className?: string;
  title?: string;
};

export function WhatsAppChannelCTA({ variant = "card", className = "", title }: Props) {
  const green = "oklch(0.62 0.17 150)";

  if (variant === "compact") {
    return (
      <a
        href={WHATSAPP_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-hover hover:opacity-90 transition ${className}`}
        style={{ background: green }}
      >
        <WhatsAppIcon className="h-4 w-4" /> Join WhatsApp Channel
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-border bg-card p-4 ${className}`}>
        <div className="flex-1">
          <p className="text-sm font-semibold">{title ?? "Join Our WhatsApp Channel"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{WHATSAPP_CHANNEL_CTA_TEXT}</p>
        </div>
        <a
          href={WHATSAPP_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white whitespace-nowrap"
          style={{ background: green }}
        >
          <WhatsAppIcon className="h-4 w-4" /> Join WhatsApp Channel
        </a>
      </div>
    );
  }

  return (
    <section className={`mx-auto max-w-7xl px-5 md:px-8 py-8 ${className}`}>
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-card flex flex-col md:flex-row items-start md:items-center gap-5">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white"
          style={{ background: green }}
        >
          <WhatsAppIcon className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.25em] font-semibold" style={{ color: green }}>
            WhatsApp Channel
          </span>
          <h3 className="mt-1 font-display text-xl md:text-2xl">{title ?? "Join Our WhatsApp Channel"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{WHATSAPP_CHANNEL_CTA_TEXT}</p>
        </div>
        <a
          href={WHATSAPP_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-hover hover:opacity-90 transition whitespace-nowrap"
          style={{ background: green }}
        >
          <WhatsAppIcon className="h-5 w-5" /> Join WhatsApp Channel
        </a>
      </div>
    </section>
  );
}
