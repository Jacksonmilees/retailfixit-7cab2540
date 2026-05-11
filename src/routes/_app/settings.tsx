import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/common/PageHeader";
import { Settings as SettingsIcon, Building2, Sparkles, Radio, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Workspace settings"
        description="Tenant, AI governance, and realtime configuration."
        icon={SettingsIcon}
        actions={<Button size="sm" className="rounded-lg"><Save className="h-3.5 w-3.5 mr-1.5" />Save changes</Button>}
      />

      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Tenant</CardTitle>
          <CardDescription className="text-[12px]">Multi-tenant scoping for this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label className="text-[12px]">Tenant ID</Label><Input readOnly value={user?.tenantId ?? ""} className="rounded-lg font-mono text-[12px]" /></div>
          <div className="space-y-1.5"><Label className="text-[12px]">Display name</Label><Input defaultValue="RetailFixIt" className="rounded-lg" /></div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI controls</CardTitle>
          <CardDescription className="text-[12px]">Governance switches for AI-assisted dispatch.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="Auto-assign on high confidence" hint="Skip dispatcher review when AI score ≥ 0.9 (audit-logged)."><Switch defaultChecked={false} /></Row>
          <Row label="Require override reason" hint="Force dispatchers to log reason when overriding AI."><Switch defaultChecked /></Row>
          <Row label="Allow AI summary on raw text" hint="Enables generate_job_summary endpoint."><Switch defaultChecked /></Row>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] flex items-center gap-2"><Radio className="h-4 w-4 text-primary" />Realtime</CardTitle>
          <CardDescription className="text-[12px]">SignalR endpoint configured server-side.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label className="text-[12px]">Hub URL</Label><Input readOnly placeholder="https://retailfixit.service.signalr.net/api/v1/hubs/ops" className="rounded-lg font-mono text-[12px]" /></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-lg">Reconnect</Button>
            <Badge variant="outline" className="text-[10px] gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />Connected</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
