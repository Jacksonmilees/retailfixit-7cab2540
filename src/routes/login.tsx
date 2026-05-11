import * as React from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ArrowRight } from "lucide-react";
import { FluentSpinner } from "@/components/common/FluentSpinner";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/dashboard" }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const [email, setEmail] = React.useState("alex@retailfixit.com");
  const [password, setPassword] = React.useState("demo");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { if (user) navigate({ to: search.redirect }); }, [user, search.redirect, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate({ to: search.redirect });
    } catch { toast.error("Sign-in failed"); } finally { setBusy(false); }
  }

  const demos = [
    { label: "Admin", email: "alex@retailfixit.com", role: "Full access" },
    { label: "Dispatcher", email: "morgan@retailfixit.com", role: "Job orchestration" },
    { label: "Vendor manager", email: "sam@retailfixit.com", role: "Vendor network" },
    { label: "Support", email: "jordan@retailfixit.com", role: "Customer support" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-mesh pointer-events-none" />
      <div className="relative w-full max-w-sm space-y-8 animate-fade-up">
        <div className="flex items-center gap-2.5 mb-2 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-primary-foreground font-semibold shadow-pop">R</div>
          <div>
            <div className="text-sm font-semibold tracking-tight">RetailFixIt</div>
            <div className="text-[11px] text-muted-foreground">Operations console</div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Welcome back. Pick an account or use your own.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 text-[14px] rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between"><Label htmlFor="password" className="text-xs font-medium">Password</Label><button type="button" className="text-[11px] text-primary hover:underline">Forgot?</button></div>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 text-[14px] rounded-lg" />
          </div>
          <Button type="submit" className="w-full h-11 rounded-lg text-[14px] font-medium bg-brand shadow-pop hover:shadow-glow transition-all" disabled={busy}>
            {busy ? (<><FluentSpinner size={16} className="mr-2 text-primary-foreground" />Signing in</>) : (<>Continue <ArrowRight className="ml-1.5 h-4 w-4" /></>)}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider"><span className="bg-background px-3 text-muted-foreground">Demo accounts</span></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {demos.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => setEmail(d.email)}
              className={`group rounded-xl border bg-card p-3 text-left transition-all hover:shadow-pop hover:-translate-y-0.5 ${email === d.email ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
            >
              <div className="text-[12px] font-medium text-foreground">{d.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{d.role}</div>
            </button>
          ))}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">Production uses Entra ID SSO · backend swap only.</p>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
