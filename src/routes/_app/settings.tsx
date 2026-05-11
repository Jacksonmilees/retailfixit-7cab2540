import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="grid gap-4 max-w-3xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Tenant</CardTitle><CardDescription>Multi-tenant scoping for this workspace.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Tenant ID</Label><Input readOnly value={user?.tenantId ?? ""} /></div>
          <div className="space-y-1.5"><Label>Display name</Label><Input defaultValue="RetailFixIt" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">AI controls</CardTitle><CardDescription>Governance switches for AI-assisted dispatch.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Row label="Auto-assign on high confidence" hint="Skip dispatcher review when AI score ≥ 0.9 (audit-logged)."><Switch defaultChecked={false} /></Row>
          <Row label="Require override reason" hint="Force dispatchers to log reason when overriding AI."><Switch defaultChecked /></Row>
          <Row label="Allow AI summary on raw text" hint="Enables generate_job_summary endpoint."><Switch defaultChecked /></Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Realtime</CardTitle><CardDescription>SignalR endpoint configured server-side.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Hub URL</Label><Input readOnly placeholder="https://retailfixit.service.signalr.net/api/v1/hubs/ops" /></div>
          <Button variant="outline" size="sm">Reconnect</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div><div className="text-sm font-medium">{label}</div>{hint && <div className="text-xs text-muted-foreground">{hint}</div>}</div>
      {children}
    </div>
  );
}
