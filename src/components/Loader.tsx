import { useEffect, useState } from "react";

export function IntroLoader() {
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1400);
    const t2 = setTimeout(() => setGone(true), 1950);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (gone) return null;
  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
      aria-hidden
    >
      <div className="text-center px-6">
        <h1 className="font-display text-5xl md:text-7xl tracking-tight animate-slide-up">
          <span style={{ color: "oklch(0.55 0.22 27)" }}>Meridian</span>{" "}
          <span style={{ color: "oklch(0.42 0.18 255)" }}>Express</span>
        </h1>
        <p className="mt-4 text-sm md:text-base uppercase tracking-[0.35em] text-muted-foreground animate-fade-in" style={{ animationDelay: "0.25s" }}>
          Always Quicker
        </p>
        <div className="mt-8 mx-auto h-px w-40 overflow-hidden bg-border">
          <div className="h-full w-1/3 bg-accent animate-[slideUp_1.6s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}