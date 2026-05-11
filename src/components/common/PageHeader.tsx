import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground truncate">{title}</h2>
          {description && <p className="text-[13px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-up", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-tertiary text-muted-foreground mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionCard({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="border-border/60 shadow-card rounded-2xl overflow-hidden">
      <CardHeader className="flex-row items-start justify-between space-y-0 gap-3 pb-3">
        <div>
          <CardTitle className="text-[15px] font-semibold tracking-tight">{title}</CardTitle>
          {description && <CardDescription className="text-[12px] mt-0.5">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-50 live-dot" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      {label}
    </span>
  );
}
