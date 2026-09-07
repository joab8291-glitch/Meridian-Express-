import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Store, Wallet, ShieldCheck, Link2, CheckCircle2 } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/join-as-introducer")({
  head: () => ({ meta: [
    { title: "Become a Product Introducer — Meridian Express" },
    { name: "description", content: "Introduce suppliers and businesses to Meridian Express and earn 1% commission on qualifying product sales." },
    { property: "og:title", content: "Product Introducer Program — Meridian Express" },
    { property: "og:description", content: "Refer suppliers to Meridian Express and earn 1% commission on qualifying sales." },
  ]}),
  component: Page,
});

function Page() {
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [accept, setAccept] = useState(false);
  const [f, setF] = useState({
    full_name: "", phone: "", whatsapp: "", email: "",
    id_number: "", county: "", town: "",
    payment_method: "mpesa", mpesa_number: "",
    password: "", confirm: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accept) return toast.error("Please accept the terms and conditions");
    if (f.password !== f.confirm) return toast.error("Passwords don't match");
    if (f.password.length < 8) return toast.error("Password must be at least 8 characters");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: f.email, password: f.password,
        options: {
          emailRedirectTo: `${window.location.origin}/pi-login`,
          data: { full_name: f.full_name, phone: f.phone, role_intent: "product_introducer" },
        },
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error("Signup failed");
      const { error: insErr } = await supabase.from("product_introducers").insert({
        id: userId,
        full_name: f.full_name, phone: f.phone,
        whatsapp: f.whatsapp || f.phone,
        email: f.email, id_number: f.id_number || null,
        county: f.county || null, town: f.town || null,
        payment_method: f.payment_method, mpesa_number: f.mpesa_number || null,
        status: "pending",
      });
      if (insErr) throw insErr;
      toast.success("Application received! We'll review and approve shortly.");
      nav({ to: "/pi-login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Application failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <section className="relative overflow-hidden" style={{ background: "var(--navy)" }}>
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-20 md:py-24 text-white">
          <span className="text-xs uppercase tracking-[0.25em] text-white/70">Product Introducer Program</span>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Introduce suppliers. Earn <span className="text-accent">1%</span> on every sale.</h1>
          <p className="mt-4 max-w-2xl text-white/80">
            Help businesses and suppliers join Meridian Express and earn a 1% commission whenever customers purchase products supplied by businesses registered using your referral code.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#apply" className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90">Apply as a Product Introducer</a>
            <Link to="/pi-login" className="inline-flex items-center rounded-full border border-white/30 px-6 py-3 text-sm text-white hover:bg-white/10">Already registered? Login</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 md:px-8 py-14">
        <SectionHeader eyebrow="How it works" title="From application to commission" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: "Apply & get approved", text: "Submit your details. We review and activate your account." },
            { icon: Link2, title: "Get your PI code", text: "Receive a unique code like PI-KEVIN-1024 and a shareable link." },
            { icon: Store, title: "Introduce suppliers", text: "Share your link with businesses ready to sell on Meridian Express." },
            { icon: Wallet, title: "Earn 1% forever", text: "When customers buy their products, you earn 1% commission." },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/50 py-12">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="text-xs uppercase tracking-wider text-primary font-semibold">Commission Example</div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 text-sm">
              <ul className="space-y-1"><li>Product sale amount: <b>KSh 10,000</b></li><li>Product Introducer commission: <b>1%</b></li><li>Commission earned: <b className="text-primary">KSh 100</b></li></ul>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />Only from confirmed orders</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />Per-supplier, per-item calculation</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />Cancelled/refunded orders are excluded</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="apply" className="mx-auto max-w-3xl px-5 md:px-8 py-14">
        <SectionHeader eyebrow="Apply Now" title="Product Introducer Application" />
        <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" value={f.full_name} onChange={set("full_name")} required />
            <Field label="Phone number *" value={f.phone} onChange={set("phone")} required />
            <Field label="WhatsApp number" value={f.whatsapp} onChange={set("whatsapp")} placeholder="If different from phone" />
            <Field label="Email address *" type="email" value={f.email} onChange={set("email")} required />
            <Field label="National ID Number *" value={f.id_number} onChange={set("id_number")} required />
            <Field label="County *" value={f.county} onChange={set("county")} required />
            <Field label="Town / Location *" value={f.town} onChange={set("town")} required />
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Preferred Payment Method *</span>
              <select required value={f.payment_method} onChange={set("payment_method")}
                className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm">
                <option value="mpesa">M-Pesa</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </label>
            <Field label="M-Pesa Number *" value={f.mpesa_number} onChange={set("mpesa_number")} required />
            <Field label="Password *" type="password" value={f.password} onChange={set("password")} required />
            <Field label="Confirm Password *" type="password" value={f.confirm} onChange={set("confirm")} required />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1" />
            <span>I accept the Meridian Express Product Introducer terms and conditions.</span>
          </label>
          <Button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit Application"}</Button>
          <p className="text-xs text-center text-muted-foreground">Applications are reviewed by Meridian Express before activation.</p>
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