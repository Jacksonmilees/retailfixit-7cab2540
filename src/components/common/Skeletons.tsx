import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Premium skeletons used across all pages. */

export function ShimmerBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-md", className)} />;
}

export function MetricCardSkeleton() {
  return (
    <Card className="border-border/60 rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => <MetricCardSkeleton key={i} />)}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("border-border/60 rounded-2xl", className)}>
      <CardHeader className="space-y-2 pb-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent className="h-72 flex items-end gap-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${30 + Math.sin(i) * 35 + 30}%` }} />
        ))}
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <Card className="border-border/60 rounded-2xl">
      <CardContent className="p-0">
        <div className="border-b border-border/60 px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3" />)}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="border-b border-border/40 px-4 py-3.5 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
            {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-3.5" style={{ width: `${50 + ((r + c) * 17) % 50}%` }} />)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-32 rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 rounded-2xl">
          <CardHeader className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
            <div className="grid grid-cols-3 gap-3 pt-3">
              {Array.from({ length: 3 }).map((_, i) => (<div key={i} className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-28" /></div>))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 rounded-2xl">
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-10" /></div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="border-border/60 rounded-2xl">
      <CardContent className="divide-y divide-border/60 p-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
