import { cn } from "@/lib/utils";

/**
 * Microsoft Fluent UI–inspired progress ring.
 * A thin arc rotating inside a faint track. Renders crisp at any size.
 */
export function FluentSpinner({
  size = 20,
  className,
  thickness,
  label,
}: {
  size?: number;
  className?: string;
  thickness?: number;
  label?: string;
}) {
  const stroke = thickness ?? Math.max(1.5, size / 12);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      role="progressbar"
      aria-label={label ?? "Loading"}
      className={cn("inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="animate-spin"
        style={{ animationDuration: "1.1s" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * 0.72}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
    </span>
  );
}

export function FullPageLoader({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-bg-secondary text-muted-foreground">
      <FluentSpinner size={28} className="text-primary" />
      <div className="text-[12px] tracking-wide">{label}…</div>
    </div>
  );
}

export function InlineLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-[12px] text-muted-foreground", className)}>
      <FluentSpinner size={14} className="text-primary" />
      {label && <span>{label}</span>}
    </div>
  );
}
