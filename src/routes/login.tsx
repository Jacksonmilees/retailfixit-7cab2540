import * as React from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

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

  React.useEffect(() => {
    if (user) navigate({ to: search.redirect });
  }, [user, search.redirect, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate({ to: search.redirect });
    } catch {
      toast.error("Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  const demos = [
    { label: "Admin", email: "alex@retailfixit.com" },
    { label: "Dispatcher", email: "morgan@retailfixit.com" },
    { label: "Vendor manager", email: "sam@retailfixit.com" },
    { label: "Support", email: "jordan@retailfixit.com" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">R</div>
          <div>
            <div className="text-base font-semibold text-foreground">RetailFixIt</div>
            <div className="text-xs text-muted-foreground">Operations console</div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use any demo account below — backend will replace this.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <div className="mt-6">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Demo accounts</div>
              <div className="grid grid-cols-2 gap-2">
                {demos.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    className="rounded border border-border bg-background hover:bg-accent text-left p-2"
                    onClick={() => setEmail(d.email)}
                  >
                    <div className="text-xs font-medium text-foreground">{d.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{d.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          SSO via Entra ID is wired in the API layer — backend swap only.
        </p>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
