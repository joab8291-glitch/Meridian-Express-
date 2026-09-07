import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth, type AccountType } from "@/lib/store";
import { toast } from "sonner";
import { KENYA_COUNTIES, BUSINESS_TYPES } from "@/lib/kenya";
import { Combobox, MultiCombobox } from "@/components/Combobox";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Meridian Express" }] }),
  component: Auth,
});

function Field({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input {...p} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}

function Auth() {
  const { login, signup, user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(user ? "login" : "signup");
  const [type, setType] = useState<AccountType>("personal");
  const [f, setF] = useState({
    name: "", email: "", phone: "", password: "",
    businessName: "", businessLocation: "",
    county: "", exactLocation: "", businessType: "", businessTypeOther: "",
    piReferralCode: "",
  });
  const [businessCategories, setBusinessCategories] = useState<string[]>([]);

  // Prefill Product Introducer referral code from ?ref=PI-... in the URL.
  if (typeof window !== "undefined" && !f.piReferralCode) {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^PI-/i.test(ref)) {
      // Defer state update to avoid setState-in-render warning.
      setTimeout(() => setF((s) => (s.piReferralCode ? s : { ...s, piReferralCode: ref.toUpperCase() })), 0);
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      if (login(f.email, f.password)) {
        toast.success("Welcome back!");
        nav({ to: "/dashboard" });
      } else toast.error("Invalid credentials");
      return;
    }
    if (type === "business") {
      if (!f.county || !(KENYA_COUNTIES as readonly string[]).includes(f.county)) return toast.error("Please select a valid county from the list.");
      if (!f.exactLocation.trim()) return toast.error("Please enter your exact business location.");
      if (businessCategories.length === 0) return toast.error("Please add at least one business category.");
    }
    signup({
      email: f.email, name: f.name, phone: f.phone, password: f.password, accountType: type,
      business: type === "business" ? {
        name: f.businessName, category: businessCategories[0] ?? "",
        businessCategories,
        location: f.exactLocation || f.businessLocation,
        email: f.email, phone: f.phone,
        county: f.county, exactLocation: f.exactLocation,
        businessType: businessCategories[0] ?? "",
        piReferralCode: f.piReferralCode.trim() ? f.piReferralCode.trim().toUpperCase() : undefined,
      } : undefined,
    });
    toast.success("Account created!");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <SectionHeader center eyebrow="Account" title={mode === "login" ? "Welcome back" : "Create your account"} subtitle="Personal accounts for shoppers. Business accounts for partners." />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card animate-slide-up">
        <div className="flex rounded-full bg-secondary p-1 mb-5 text-sm font-medium">
          {(["login", "signup"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-full py-2 transition ${mode === m ? "bg-white shadow text-primary" : "text-muted-foreground"}`}>
              {m === "login" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>
        {mode === "signup" && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(["personal", "business"] as AccountType[]).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={`rounded-xl border p-3 text-left transition ${type === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                <div className="font-semibold capitalize">{t} Account</div>
                <p className="text-xs text-muted-foreground mt-1">{t === "personal" ? "Browse, save items & order via WhatsApp." : "For businesses & partners."}</p>
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && <Field label="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
          <Field label="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          {mode === "signup" && <Field label="Phone" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />}
          <Field label="Password" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          {mode === "signup" && type === "business" && (
            <>
              <Field label="Business name" required value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} />
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Business Categories (select one or more)</span>
                <div className="mt-1">
                  <MultiCombobox values={businessCategories} onChange={setBusinessCategories} options={BUSINESS_TYPES} placeholder="Type to search categories…" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">County</span>
                <div className="mt-1">
                  <Combobox value={f.county} onChange={(v) => setF({ ...f, county: v })} options={KENYA_COUNTIES} placeholder="Type to search counties (e.g. Nairobi)…" required />
                </div>
              </label>
              <Field label="Exact Business Location" required placeholder="Enter exact location, estate, street, building, town, or area" value={f.exactLocation} onChange={(e) => setF({ ...f, exactLocation: e.target.value })} />
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Product Introducer Referral Code (optional)</span>
                <input value={f.piReferralCode} onChange={(e) => setF({ ...f, piReferralCode: e.target.value })}
                  placeholder="e.g. PI-KEVIN-1024"
                  className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 uppercase" />
                <span className="mt-1 block text-[11px] text-muted-foreground">Enter the referral code of the person who introduced your business to Meridian Express.</span>
              </label>
            </>
          )}
          <Button type="submit" size="lg" className="w-full">{mode === "login" ? "Sign in" : "Create account"}</Button>
        </form>
      </div>
    </div>
  );
}