import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Hammer, Truck, Sparkles } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About Us — Meridian Express" }, { name: "description", content: "Meridian Express connects customers with quality Kamukunji-fabricated products." }] }),
  component: About,
});

function About() {
  return (
    <div>
      <section className="bg-gradient-hero text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center animate-slide-up">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">About Meridian Express</span>
          <h1 className="mt-3 text-3xl md:text-5xl font-bold">Quality Kamukunji products, delivered with trust.</h1>
          <p className="mt-4 text-white/85 max-w-2xl mx-auto">We connect customers across Kenya with skilled Kamukunji fabricators, offering durable, affordable, locally made products.</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-14 grid gap-8 md:grid-cols-2">
        <div>
          <SectionHeader eyebrow="Who We Are" title="A trusted bridge to Kamukunji's best makers" />
          <p className="text-muted-foreground">Meridian Express is an e-commerce platform built to make Kamukunji-fabricated goods accessible to homes, businesses and institutions across Kenya. We curate trusted artisans, verify quality, and handle the logistics so you don't have to.</p>
          <SectionHeader eyebrow="What We Sell" title="From kitchens to construction" />
          <p className="text-muted-foreground">Metal works, kitchen equipment, storage solutions, hardware and custom-fabricated items. If it's made in Kamukunji, we can deliver it.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Hammer, t: "Quality Craftsmanship", d: "Skilled fabricators with proven results." },
            { icon: ShieldCheck, t: "Our Promise", d: "Honest pricing, real products, real service." },
            { icon: Truck, t: "Reliable Delivery", d: "Nationwide delivery you can trust." },
            { icon: Sparkles, t: "Custom Builds", d: "Order made-to-spec with confidence." },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-card animate-slide-up" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-hero text-white"><c.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold">{c.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}