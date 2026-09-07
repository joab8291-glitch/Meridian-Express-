export function SectionHeader({
  eyebrow, title, subtitle, center,
}: { eyebrow?: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={`mb-10 md:mb-14 ${center ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}`}>
      {eyebrow && <span className="inline-block text-[10px] font-medium uppercase tracking-[0.3em] text-accent">{eyebrow}</span>}
      <h2 className="mt-3 font-display text-3xl md:text-5xl tracking-tight text-balance">{title}</h2>
      {subtitle && <p className="mt-3 text-sm md:text-base text-muted-foreground text-balance">{subtitle}</p>}
    </div>
  );
}