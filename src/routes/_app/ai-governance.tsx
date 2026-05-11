import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/common/PageHeader";
import { Sparkles, Shield, AlertTriangle, DollarSign, GitBranch, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { MetricCard } from "@/components/common/MetricCard";

export const Route = createFileRoute("/_app/ai-governance")({ component: AIGovernancePage });

function AIGovernancePage() {
  const [killSwitch, setKillSwitch] = React.useState(false);
  const [autoAssign, setAutoAssign] = React.useState(true);
  const [piiRedaction, setPiiRedaction] = React.useState(true);
  const [confidenceFloor, setConfidenceFloor] = React.useState([72]);
  const [temperature, setTemperature] = React.useState([0.2]);
  const [model, setModel] = React.useState("gpt-4o-mini");
  const [promptVersion, setPromptVersion] = React.useState("v3.2");

  const promptVersions = [
    { v: "v3.2", date: "2026-05-08", author: "morgan@", status: "active", winRate: "+4.1%" },
    { v: "v3.1", date: "2026-04-22", author: "alex@", status: "shadow", winRate: "—" },
    { v: "v3.0", date: "2026-03-30", author: "alex@", status: "archived", winRate: "+2.6%" },
    { v: "v2.9", date: "2026-02-14", author: "morgan@", status: "archived", winRate: "+1.8%" },
  ];

  const guardrails = [
    { id: "pii", name: "PII redaction", desc: "Strip names, phone numbers, addresses before model call", on: piiRedaction, set: setPiiRedaction },
    { id: "auto", name: "Auto-assign on high confidence", desc: `Skip dispatcher review when score ≥ ${confidenceFloor[0]}%`, on: autoAssign, set: setAutoAssign },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Governance"
        description="Model pinning, prompt versions, guardrails, and safety controls"
        icon={Shield}
        actions={
          <Button variant={killSwitch ? "destructive" : "outline"} size="sm" onClick={() => { setKillSwitch(v => !v); toast.success(killSwitch ? "AI re-enabled" : "AI kill-switch engaged"); }}>
            <Power className="h-3.5 w-3.5 mr-1.5" /> {killSwitch ? "AI disabled — re-enable" : "Kill-switch"}
          </Button>
        }
      />

      {killSwitch && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-[13px]">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          <div><strong>AI dispatch is disabled.</strong> All jobs will fall back to manual assignment. Existing recommendations are still visible but cannot be applied.</div>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active model" value={model} icon={Sparkles} />
        <MetricCard label="Prompt version" value={promptVersion} icon={GitBranch} />
        <MetricCard label="Override rate (7d)" value="14.2%" icon={AlertTriangle} delta={{ value: -2.1, label: "vs last week" }} />
        <MetricCard label="Avg cost / rec" value="$0.0042" icon={DollarSign} delta={{ value: -8, label: "vs last week" }} />
      </div>

      <Tabs defaultValue="model" className="space-y-4">
        <TabsList>
          <TabsTrigger value="model">Model & prompts</TabsTrigger>
          <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          <TabsTrigger value="cost">Cost</TabsTrigger>
        </TabsList>

        <TabsContent value="model" className="space-y-4">
          <SectionCard title="Inference configuration" description="Pinned model and inference parameters used by the dispatch engine">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">gpt-4o-mini (Azure OpenAI)</SelectItem>
                    <SelectItem value="gpt-4o">gpt-4o (Azure OpenAI)</SelectItem>
                    <SelectItem value="gpt-4-turbo">gpt-4-turbo (Azure OpenAI)</SelectItem>
                    <SelectItem value="local-ranker">internal-ranker-v2 (Azure ML)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Active prompt version</Label>
                <Select value={promptVersion} onValueChange={setPromptVersion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {promptVersions.map(p => <SelectItem key={p.v} value={p.v}>{p.v} — {p.date}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between"><Label className="text-xs">Temperature</Label><span className="text-xs text-muted-foreground">{temperature[0].toFixed(2)}</span></div>
                <Slider value={temperature} onValueChange={setTemperature} max={1} step={0.05} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between"><Label className="text-xs">Auto-assign confidence floor</Label><span className="text-xs text-muted-foreground">{confidenceFloor[0]}%</span></div>
                <Slider value={confidenceFloor} onValueChange={setConfidenceFloor} max={100} step={1} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Prompt history" description="Versioned dispatch prompts with promotion controls">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Win rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promptVersions.map(p => (
                  <TableRow key={p.v}>
                    <TableCell className="font-mono text-[12px]">{p.v}</TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{p.date}</TableCell>
                    <TableCell className="text-[12px]">{p.author}</TableCell>
                    <TableCell className="text-[12px]">{p.winRate}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px] capitalize">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => toast.info(`Diff for ${p.v}`)}>Diff</Button>
                      {p.status !== "active" && <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { setPromptVersion(p.v); toast.success(`Promoted ${p.v}`); }}>Promote</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="guardrails" className="space-y-4">
          <SectionCard title="Safety controls" description="Pre- and post-call guardrails applied to every recommendation">
            <div className="space-y-3">
              {guardrails.map(g => (
                <div key={g.id} className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-3">
                  <div>
                    <div className="text-[13px] font-medium">{g.name}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{g.desc}</div>
                  </div>
                  <Switch checked={g.on} onCheckedChange={g.set} />
                </div>
              ))}
              <div className="rounded-xl border border-border/60 p-3 space-y-2">
                <Label className="text-[13px] font-medium">Forbidden categories</Label>
                <Input placeholder="hazardous-materials, after-hours-emergency, …" defaultValue="hazardous-materials, after-hours-emergency" />
                <p className="text-[11px] text-muted-foreground">Recommendations will never auto-assign jobs matching these categories.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Human override policy" description="When dispatcher overrides AI">
            <ul className="space-y-2 text-[13px]">
              <li className="flex items-center justify-between"><span>Require reason on override</span><Badge>Enforced</Badge></li>
              <li className="flex items-center justify-between"><span>Audit log entry on every override</span><Badge>Enforced</Badge></li>
              <li className="flex items-center justify-between"><span>Auto-flag prompt for review at &gt;25% override</span><Badge variant="secondary">Active</Badge></li>
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Tokens (24h)" value="1.42M" icon={Sparkles} />
            <MetricCard label="Cost (24h)" value="$5.96" icon={DollarSign} />
            <MetricCard label="Cache hit rate" value="68%" icon={GitBranch} delta={{ value: 4, label: "vs last week" }} />
          </div>
          <SectionCard title="Cost controls" description="Caps that protect against runaway spend">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">Daily token cap</Label><Input defaultValue="5000000" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Per-tenant monthly cap (USD)</Label><Input defaultValue="500" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Cache TTL (minutes)</Label><Input defaultValue="60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Fallback model when over cap</Label><Input defaultValue="internal-ranker-v2" /></div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
