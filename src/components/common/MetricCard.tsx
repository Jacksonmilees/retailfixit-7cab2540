import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  delta,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive" | "primary";
  delta?: string;
  trend?: "up" | "down";
}) {
  const accent = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-foreground",
    destructive: "text-destructive",
    primary: "text-primary",
  }[tone];
  const iconBg = {
    default: "bg-bg-tertiary text-muted-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
  }[tone];

  return (
    <Card className="border-border/60 shadow-card hover:shadow-pop transition-shadow rounded-2xl overflow-hidden group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className={cn("text-3xl font-semibold tracking-tight tabular-nums", accent)}>{value}</div>
              {delta && (
                <div className={cn("flex items-center text-[11px] font-medium", trend === "up" ? "text-success" : "text-destructive")}>
                  {trend === "up" ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {delta}
                </div>
              )}
            </div>
            {hint && <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>}
          </div>
          {Icon && (
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105", iconBg)}>
              <Icon className="h-[18px] w-[18px]" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
