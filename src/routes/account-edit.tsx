import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth } from "@/lib/store";
import { KENYA_COUNTIES, BUSINESS_TYPES } from "@/lib/kenya";
import { Combobox, MultiCombobox } from "@/components/Combobox";
import { toast } from "sonner";

export const Route = createFileRoute("/account-edit")({
  head: () => ({ meta: [{ title: "Edit Business Account — Meridian Express" }] }),
  component: AccountEdit,
});

function Field({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input {...p} className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}

function AccountEdit() {
  const { user, updateBusiness } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!user) nav({ to: "/auth" });
    else if (user.accountType !== "business" || !user.business) nav({ to: "/dashboard" });
  }, [user, nav]);

  const biz = user?.business;
  const [f, setF] = useState({
    name: biz?.name ?? "",
    phone: biz?.phone ?? "",
    email: biz?.email ?? "",
    county: biz?.county ?? "",
    exactLocation: biz?.exactLocation ?? biz?.location ?? "",
    contactPerson: biz?.contactPerson ?? "",
    description: biz?.description ?? "",
    social: biz?.social ?? "",
  });
  const [categories, setCategories] = useState<string[]>(biz?.businessCategories?.length ? biz.businessCategories : (biz?.businessType ? [biz.businessType] : (biz?.category ? [biz.category] : [])));

  if (!user || !biz) return null;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.county || !(KENYA_COUNTIES as readonly string[]).includes(f.county)) return toast.error("Please select a valid county from the list.");
    if (!f.exactLocation.trim()) return toast.error("Please enter your exact business location.");
    if (categories.length === 0) return toast.error("Please add at least one business category.");

    updateBusiness({
      ...biz,
      name: f.name,
      phone: f.phone,
      email: f.email,
      county: f.county,
      exactLocation: f.exactLocation,
      location: f.exactLocation,
      category: categories[0] ?? "",
      businessCategories: categories,
      businessType: categories[0] ?? "",
      contactPerson: f.contactPerson,
      description: f.description,
      social: f.social,
    });

    // Also persist into me_accounts so seeded record stays in sync.
    try {
      const accounts = JSON.parse(localStorage.getItem("me_accounts") || "{}");
      const rec = accounts[user.email];
      if (rec) {
        rec.user = { ...rec.user, business: { ...rec.user.business, ...{
          name: f.name, phone: f.phone, email: f.email, county: f.county,
          exactLocation: f.exactLocation, location: f.exactLocation,
          category: categories[0] ?? "", businessCategories: categories,
          businessType: categories[0] ?? "",
          contactPerson: f.contactPerson, description: f.description, social: f.social,
        } } };
        localStorage.setItem("me_accounts", JSON.stringify(accounts));
      }
    } catch {}

    toast.success("Account updated");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <button onClick={() => nav({ to: "/dashboard" })} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>
      <SectionHeader eyebrow="Account" title="Edit Business Account" subtitle="Update your business details, location and categories. Changes apply immediately." />
      <form onSubmit={save} className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card sm:grid-cols-2">
        <Field label="Business name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Field label="Phone number" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <Field label="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Field label="Contact person (optional)" value={f.contactPerson} onChange={(e) => setF({ ...f, contactPerson: e.target.value })} />

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Business Categories</span>
          <div className="mt-1">
            <MultiCombobox values={categories} onChange={setCategories} options={BUSINESS_TYPES} placeholder="Type to search and add categories…" />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">County</span>
          <div className="mt-1">
            <Combobox value={f.county} onChange={(v) => setF({ ...f, county: v })} options={KENYA_COUNTIES} placeholder="Type to search counties (e.g. Nairobi)…" required />
          </div>
        </label>
        <Field label="Exact business location" required placeholder="Estate, street, building, town or area" value={f.exactLocation} onChange={(e) => setF({ ...f, exactLocation: e.target.value })} />

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Business description (optional)</span>
          <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="mt-1 min-h-[90px] w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
        <Field label="Social media link (optional)" placeholder="https://…" value={f.social} onChange={(e) => setF({ ...f, social: e.target.value })} />

        <Button type="submit" className="sm:col-span-2"><Save className="h-4 w-4" /> Save changes</Button>
      </form>
    </div>
  );
}