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
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/20 p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-2xl shadow-xl">R</div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in to RetailFixIt</h2>
              <p className="text-sm text-slate-500 mt-1">Enter your credentials to access the operations console.</p>
            </div>
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
          <Button type="submit" className="w-full h-11 rounded-lg text-[14px] font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all" disabled={busy}>
            {busy ? (<><FluentSpinner size={16} className="mr-2 text-white" />Signing in...</>) : (<>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>)}
          </Button>
        </form>

          <div className="text-center pt-2">
            <p className="text-[12px] text-slate-400">
              Default login: <span className="font-medium text-slate-600">demo@retailfixit.com</span> / <span className="font-medium text-slate-600">demo123</span>
            </p>
          </div>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
