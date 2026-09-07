import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UserPlus, ShieldCheck, Store, ClipboardCheck, PackageCheck } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/join-as-product-agent")({
  head: () => ({ meta: [
    { title: "Become a Product Introduction Agent — Meridian Express" },
    { name: "description", content: "Apply to become a Meridian Express Product Introduction Agent. Introduce suppliers, submit products for review, and grow the Meridian Express catalog." },
    { property: "og:title", content: "Product Introduction Agent Program — Meridian Express" },
    { property: "og:description", content: "Apply to become a Meridian Express Product Introduction Agent." },
  ]}),
  component: Page,
});

function Page() {
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [accept, setAccept] = useState(false);
  const [f, setF] = useState({
    full_name: "", phone: "", email: "", national_id: "",
    county: "", town: "", assigned_region: "",
    mpesa_number: "", referred_by_code: "",
    password: "", confirm: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accept) return toast.error("Please accept the terms");
    if (f.password !== f.confirm) return toast.error("Passwords don't match");
    if (f.password.length < 8) return toast.error("Password must be at least 8 characters");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: f.email, password: f.password,
        options: {
          emailRedirectTo: `${window.location.origin}/product-agent-login`,
          data: { full_name: f.full_name, phone: f.phone, role_intent: "product_intro_agent" },
        },
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error("Signup failed");
      const { error: insErr } = await supabase.from("product_intro_agents" as never).insert({
        id: userId,
        full_name: f.full_name, phone: f.phone, email: f.email,
        national_id: f.national_id || null,
        county: f.county || null, town: f.town || null,
        assigned_region: f.assigned_region || null,
        mpesa_number: f.mpesa_number || null,
        referred_by_code: f.referred_by_code || null,
        status: "pending",
      } as never);
      if (insErr) throw insErr;
      toast.success("Application received! We'll review and notify you once approved.");
      nav({ to: "/product-agent-login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Application failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <section className="relative overflow-hidden" style={{ background: "var(--navy)" }}>
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-20 md:py-24 text-white">
          <span className="text-xs uppercase tracking-[0.25em] text-white/70">Product Introduction Agent Program</span>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Introduce suppliers. Submit products. Grow the catalog.</h1>
          <p className="mt-4 max-w-2xl text-white/80">
            Meridian Express Product Introduction Agents work in the field — meeting suppliers,
            collecting product information, and submitting listings for review by our team.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#apply" className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90">Apply Now</a>
            <Link to="/product-agent-login" className="inline-flex items-center rounded-full border border-white/30 px-6 py-3 text-sm text-white hover:bg-white/10">Already registered? Login</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 md:px-8 py-14">
        <SectionHeader eyebrow="How it works" title="Four simple steps" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: UserPlus, title: "Apply", text: "Submit your details and wait for approval." },
            { icon: ShieldCheck, title: "Get approved", text: "Receive your unique MEX-PIA agent code." },
            { icon: Store, title: "Introduce suppliers", text: "Add supplier details from the field." },
            { icon: ClipboardCheck, title: "Submit products", text: "Upload products for admin review." },
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
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-sm">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <PackageCheck className="h-4 w-4" /> Product submission workflow
            </div>
            <p className="mt-2 text-muted-foreground">
              Draft → Submitted → Under Review → Approved → Live. You'll receive in-dashboard
              notifications at each step. Compensation details will be shared with you after your
              account has been approved.
            </p>
          </div>
        </div>
      </section>

      <section id="apply" className="mx-auto max-w-3xl px-5 md:px-8 py-14">
        <SectionHeader eyebrow="Apply Now" title="Product Introduction Agent Application" />
        <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" value={f.full_name} onChange={set("full_name")} required />
            <Field label="Phone *" value={f.phone} onChange={set("phone")} required />
            <Field label="Email *" type="email" value={f.email} onChange={set("email")} required />
            <Field label="National ID *" value={f.national_id} onChange={set("national_id")} required />
            <Field label="County *" value={f.county} onChange={set("county")} required />
            <Field label="Town *" value={f.town} onChange={set("town")} required />
            <Field label="Assigned / preferred region" value={f.assigned_region} onChange={set("assigned_region")} placeholder="Optional" />
            <Field label="M-Pesa number *" value={f.mpesa_number} onChange={set("mpesa_number")} required />
            <Field label="Referred by (code)" value={f.referred_by_code} onChange={set("referred_by_code")} placeholder="Optional" />
            <div />
            <Field label="Password *" type="password" value={f.password} onChange={set("password")} required />
            <Field label="Confirm Password *" type="password" value={f.confirm} onChange={set("confirm")} required />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1" />
            <span>I accept the Meridian Express Product Introduction Agent terms and conditions.</span>
          </label>
          <Button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit Application"}</Button>
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