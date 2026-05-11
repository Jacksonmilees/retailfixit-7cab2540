import * as React from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";

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
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh pointer-events-none" />
      <div className="relative grid lg:grid-cols-2 min-h-screen">
        {/* Left: brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-navy text-navy-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(at 30% 20%, oklch(0.52 0.21 261 / 0.5) 0px, transparent 50%), radial-gradient(at 80% 80%, oklch(0.62 0.2 280 / 0.4) 0px, transparent 50%)" }} />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand shadow-float font-semibold text-lg">R</div>
              <div>
                <div className="text-base font-semibold tracking-tight">RetailFixIt</div>
                <div className="text-xs text-navy-foreground/60">Operations console</div>
              </div>
            </div>
          </div>

          <div className="relative space-y-8 max-w-md animate-fade-up">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight leading-tight text-balance">
                Coordinate every job. Faster, smarter, with AI on your side.
              </h1>
              <p className="mt-4 text-[15px] text-navy-foreground/70 leading-relaxed text-pretty">
                One platform for dispatchers, vendor managers, and support — built on Azure with real-time updates and Azure OpenAI assistance.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: Sparkles, title: "AI vendor recommendations", desc: "Ranked candidates with reasoning, confidence, and human override." },
                { icon: Zap, title: "Real-time dashboards", desc: "SignalR-powered updates across every operator screen." },
                { icon: ShieldCheck, title: "Tenant-isolated RBAC", desc: "Entra ID with role-aware access and full audit trail." },
              ].map((f) => (
                <div key={f.title} className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10"><f.icon className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-medium">{f.title}</div>
                    <div className="text-xs text-navy-foreground/60 mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative text-xs text-navy-foreground/50">© RetailFixIt · Designed for production operations</div>
        </div>

        {/* Right: form */}
        <div className="flex items-center justify-center p-6 lg:p-12 relative">
          <div className="w-full max-w-sm space-y-8 animate-fade-up">
            <div className="lg:hidden flex items-center gap-2.5 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-primary-foreground font-semibold shadow-pop">R</div>
              <div>
                <div className="text-sm font-semibold tracking-tight">RetailFixIt</div>
                <div className="text-[11px] text-muted-foreground">Operations console</div>
              </div>
            </div>

            <div>
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
                {busy ? "Signing in…" : (<>Continue <ArrowRight className="ml-1.5 h-4 w-4" /></>)}
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
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
