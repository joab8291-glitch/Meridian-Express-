import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { waLink, PHONE_DISPLAY } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact Us — Meridian Express" }, { name: "description", content: "Get in touch with Meridian Express for orders and inquiries." }] }),
  component: Contact,
});

function Contact() {
  const [f, setF] = useState({ name: "", phone: "", email: "", product: "", message: "" });
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `Hello Meridian Express!\n\nName: ${f.name}\nPhone: ${f.phone}\nEmail: ${f.email}\nProduct: ${f.product}\n\n${f.message}`;
    window.open(waLink(msg), "_blank");
    toast.success("Opening WhatsApp…");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <SectionHeader center eyebrow="Get In Touch" title="Contact Meridian Express" subtitle="We'd love to help. Reach us via WhatsApp, call, or email." />
      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          { icon: Phone, t: "Call Us", v: PHONE_DISPLAY, href: `tel:${PHONE_DISPLAY}` },
          { icon: WhatsAppIcon, t: "WhatsApp", v: PHONE_DISPLAY, href: waLink("Hello Meridian Express!") },
          { icon: Mail, t: "Email", v: "info@meridianexpress.co.ke", href: "mailto:info@meridianexpress.co.ke" },
        ].map((c, i) => (
          <a key={i} href={c.href} target={c.t === "WhatsApp" ? "_blank" : undefined} rel="noreferrer" className="group rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-hover animate-slide-up" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-hero text-white"><c.icon className="h-5 w-5" /></div>
            <h3 className="mt-4 font-semibold">{c.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground group-hover:text-primary">{c.v}</p>
          </a>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-3">
          <h3 className="text-lg font-semibold">Send us a message</h3>
          {[
            ["name", "Full name"], ["phone", "Phone number"], ["email", "Email"], ["product", "Product you're interested in"],
          ].map(([k, label]) => (
            <input key={k} required value={(f as never)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={label} className="w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          ))}
          <textarea required value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Your message" rows={4} className="w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <Button type="submit" className="w-full"><Send className="h-4 w-4" /> Send via WhatsApp</Button>
        </form>
        <div className="rounded-2xl overflow-hidden border border-border shadow-card relative min-h-[280px]">
          <div className="absolute inset-0 bg-gradient-hero opacity-90" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
            <MapPin className="h-10 w-10" />
            <h3 className="mt-3 text-xl font-bold">Nairobi, Kenya</h3>
            <p className="mt-1 text-white/85 text-sm">Sourcing direct from Kamukunji artisans.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
