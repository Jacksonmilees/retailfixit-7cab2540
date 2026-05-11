import * as React from "react";
import type { JobStatus, JobPriority } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLE: Record<JobStatus, string> = {
  new: "bg-info/10 text-info border-info/30",
  triaged: "bg-accent text-accent-foreground border-border",
  assigned: "bg-primary/10 text-primary border-primary/30",
  in_progress: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  on_hold: "bg-warning/15 text-foreground border-warning/40",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<JobStatus, string> = {
  new: "New",
  triaged: "Triaged",
  assigned: "Assigned",
  in_progress: "In progress",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLE[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const PRIORITY_STYLE: Record<JobPriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  normal: "bg-accent text-accent-foreground border-border",
  high: "bg-warning/20 text-foreground border-warning/40",
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
};

export function PriorityBadge({ priority }: { priority: JobPriority }) {
  return (
    <Badge variant="outline" className={PRIORITY_STYLE[priority]}>
      {priority[0].toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

export function RiskBadge({ risk }: { risk?: "low" | "medium" | "high" }) {
  if (!risk) return null;
  const cls =
    risk === "high"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : risk === "medium"
      ? "bg-warning/20 text-foreground border-warning/40"
      : "bg-success/15 text-success border-success/30";
  return <Badge variant="outline" className={cls}>{risk[0].toUpperCase() + risk.slice(1)} risk</Badge>;
}

export function TimeAgo({ iso }: { iso: string }) {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const t = setInterval(() => force(), 60000);
    return () => clearInterval(t);
  }, []);
  const ms = Date.now() - new Date(iso).getTime();
  const past = ms >= 0;
  const abs = Math.abs(ms);
  const m = Math.round(abs / 60000);
  if (m < 1) return <span>just now</span>;
  if (m < 60) return <span>{past ? `${m}m ago` : `in ${m}m`}</span>;
  const h = Math.round(m / 60);
  if (h < 24) return <span>{past ? `${h}h ago` : `in ${h}h`}</span>;
  const d = Math.round(h / 24);
  return <span>{past ? `${d}d ago` : `in ${d}d`}</span>;
}
