import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, UserPlus, Link2, Share2, Wallet, BarChart3, ShieldCheck, Store, Wrench } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/join-our-team")({
  head: () => ({ meta: [
    { title: "Join Our Team — Meridian Express Implementer & Introducer Programs" },
    { name: "description", content: "Apply to become a Meridian Express Implementer or Product Introducer. Share referral links, help customers and businesses, and earn commission on qualifying orders." },
    { property: "og:title", content: "Join Our Team — Meridian Express" },
    { property: "og:description", content: "Apply to become an Implementer or Product Introducer at Meridian Express." },
  ]}),
  component: JoinPage,
});

const STEPS = [
  { icon: UserPlus, title: "Sign Up", text: "Fill in the implementer application form below." },
  { icon: ShieldCheck, title: "Get Approved", text: "Our team reviews your application and activates your account." },
  { icon: Link2, title: "Receive Your Code", text: "Get a unique referral code and shareable link once approved." },
  { icon: Share2, title: "Share & Sell", text: "Share your link on WhatsApp, Instagram, TikTok, Facebook and DMs." },
  { icon: Wallet, title: "Earn Commission", text: "Commission details are shared with you after your account is approved." },
  { icon: BarChart3, title: "Track Assignments", text: "Log in to view assigned orders, referred orders and progress anytime." },
];

const BENEFITS = [
  "Earn commission on every successful qualifying order",
  "Your own unique referral link and code",
  "Real-time assignment and order tracking",
  "Sell trusted Meridian Express products",
  "Work flexibly from anywhere in Kenya",
];

function JoinPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--navy)" }}>
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24 text-white">
          <span className="text-xs uppercase tracking-[0.25em] text-white/70">Join Our Team</span>
          <h1 className="mt-3 font-display text-4xl md:text-5xl tracking-tight">
            Two ways to earn with <span className="text-accent">Meridian Express</span>
          </h1>
          <p className="mt-4 max-w-2xl text-white/80">
            Choose the role that fits you best. Both come with your own referral code and real-time tracking. Commission details are shared after your account is reviewed and approved.
          </p>
        </div>
      </section>

      {/* Role picker */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 py-14">
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <RoleCard
            icon={Wrench}
            eyebrow="Implementer"
            title="Implementer"
            description="Represent Meridian Express in your area — handle referred orders, meet customers, and see assignments through to completion."
            bullets={["Unique customer referral link", "Assigned orders in your area", "Real-time order & status tracking"]}
            ctaText="Apply as an Implementer"
            ctaHref="#apply-implementer"
          />
          <RoleCard
            icon={Store}
            eyebrow="Product Introducer"
            title="Product Introducer"
            description="Help businesses and suppliers join Meridian Express. Earn a commission whenever customers purchase products supplied by businesses registered using your referral code."
            bullets={["Supplier-focused referral code", "Commission on qualifying supplier sales", "Track suppliers & their sales"]}
            ctaText="Apply as a Product Introducer"
            ctaTo="/join-as-product-agent"
            accent
          />
        </div>
      </section>

      <ImplementerApplication />
    </div>
  );
}

function RoleCard({ icon: Icon, eyebrow, title, description, bullets, ctaText, ctaHref, ctaTo, accent }: {
  icon: React.ComponentType<{ className?: string }>; eyebrow: string; title: string; description: string;
  bullets: string[]; ctaText: string; ctaHref?: string; ctaTo?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-6 md:p-8 shadow-card ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${accent ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></span>
      <div className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">{eyebrow}</div>
      <h2 className="mt-1 font-display text-2xl md:text-3xl">{title}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      <ul className="mt-4 space-y-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>{b}</span></li>
        ))}
      </ul>
      {ctaTo ? (
        <Link to={ctaTo} className={`mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold ${accent ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-accent text-white hover:opacity-90"}`}>{ctaText}</Link>
      ) : (
        <a href={ctaHref} className={`mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold ${accent ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-accent text-white hover:opacity-90"}`}>{ctaText}</a>
      )}
    </div>
  );
}

function ImplementerApplication() {
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState({
    full_name: "", phone: "", whatsapp: "", email: "",
    county: "", area: "", social: "", id_number: "", reason: "",
    password: "", confirm: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.password !== f.confirm) return toast.error("Passwords don't match");
    if (f.password.length < 8) return toast.error("Password must be at least 8 characters");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: f.email, password: f.password,
        options: {
          emailRedirectTo: `${window.location.origin}/agent-login`,
          data: { full_name: f.full_name, phone: f.phone, role_intent: "agent" },
        },
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error("Signup failed");
      const { error: insErr } = await supabase.from("agents").insert({
        id: userId,
        full_name: f.full_name, phone: f.phone, whatsapp: f.whatsapp || f.phone,
        email: f.email, county: f.county, area: f.area,
        social: f.social || null, id_number: f.id_number || null,
        reason: f.reason || null, status: "pending",
      });
      if (insErr) throw insErr;
      toast.success("Application received! We'll review and notify you once approved.");
      nav({ to: "/agent-login" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Application failed";
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--navy)" }}>
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-20 md:py-28 text-white">
          <span className="text-xs uppercase tracking-[0.25em] text-white/70">Implementer Program</span>
          <h1 className="mt-3 font-display text-4xl md:text-6xl tracking-tight">
            Join the <span className="text-accent">Meridian Express</span> Implementer Team
          </h1>
          <p className="mt-5 max-w-2xl text-white/80 text-base md:text-lg">
            Become a Meridian Express implementer, share your unique referral link, and handle assigned orders in your area from first contact through to completion.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#apply-implementer" className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90">Apply to Become an Implementer</a>
            <Link to="/agent-login" className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white hover:bg-white/10">Already an implementer? Login here</Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-16">
        <SectionHeader eyebrow="How It Works" title="From sign-up to commission in 6 steps" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></span>
                <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="mt-3 font-semibold text-lg">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-secondary/50 py-16">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <SectionHeader eyebrow="Why Join" title="Benefits of becoming an implementer" />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 rounded-xl bg-background border border-border p-4">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Commission (privacy — no rates disclosed) */}
      <section className="mx-auto max-w-5xl px-5 md:px-8 py-16">
        <SectionHeader eyebrow="Commission" title="How Implementer Commission Works" />
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
          <p className="text-sm md:text-base text-muted-foreground">
            As a Meridian Express implementer, you earn commission on successful qualifying orders.
            The exact commission structure and payment terms will be provided to you after your account
            has been reviewed and approved.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: Commission is only earned on confirmed successful orders. Cancelled, unpaid, or rejected orders do not qualify.
          </p>
        </div>
      </section>

      {/* Form */}
      <section id="apply-implementer" className="mx-auto max-w-3xl px-5 md:px-8 py-16">
        <SectionHeader eyebrow="Apply Now" title="Implementer Application" />
        <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" value={f.full_name} onChange={set("full_name")} required />
            <Field label="Phone number *" value={f.phone} onChange={set("phone")} required />
            <Field label="WhatsApp number" value={f.whatsapp} onChange={set("whatsapp")} placeholder="If different from phone" />
            <Field label="Email address *" type="email" value={f.email} onChange={set("email")} required />
            <Field label="County / location" value={f.county} onChange={set("county")} />
            <Field label="Preferred service area" value={f.area} onChange={set("area")} placeholder="Town / estate / area" />
            <Field label="Social media handle" value={f.social} onChange={set("social")} placeholder="Optional" />
            <Field label="ID number" value={f.id_number} onChange={set("id_number")} placeholder="Optional" />
          </div>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Why do you want to become an implementer?</span>
            <textarea value={f.reason} onChange={set("reason")} rows={3}
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password *" type="password" value={f.password} onChange={set("password")} required />
            <Field label="Confirm password *" type="password" value={f.confirm} onChange={set("confirm")} required />
          </div>
          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? "Submitting…" : "Submit Application"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Your implementer application will be reviewed by Meridian Express before activation. Commission details will be shared once approved.
          </p>
        </form>
      </section>
    </div>
  );
}

function Field({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input {...p}
        className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}