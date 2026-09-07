import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/agent-login")({
  head: () => ({ meta: [{ title: "Implementer Login — Meridian Express" }] }),
  component: ImplementerLogin,
});

function ImplementerLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      nav({ to: "/agent" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <SectionHeader eyebrow="Implementer" title="Login to your dashboard" />
      <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
        <Button type="submit" disabled={loading}>{loading ? "Signing in…" : "Login"}</Button>
        <p className="text-xs text-center text-muted-foreground">
          Not an implementer yet? <Link to="/join-our-team" className="text-primary hover:underline">Apply here</Link>
        </p>
      </form>
    </div>
  );
}