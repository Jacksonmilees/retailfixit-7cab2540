import * as React from "react";

type Json = Record<string, unknown> | null | undefined;

type DiffRow = { key: string; before: unknown; after: unknown; kind: "added" | "removed" | "changed" | "unchanged" };

function diff(before: Json, after: Json): DiffRow[] {
  const b = before ?? {};
  const a = after ?? {};
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).sort();
  return keys.map((key) => {
    const bv = (b as Record<string, unknown>)[key];
    const av = (a as Record<string, unknown>)[key];
    const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
    if (!has(b, key)) return { key, before: undefined, after: av, kind: "added" as const };
    if (!has(a, key)) return { key, before: bv, after: undefined, kind: "removed" as const };
    if (JSON.stringify(bv) !== JSON.stringify(av)) return { key, before: bv, after: av, kind: "changed" as const };
    return { key, before: bv, after: av, kind: "unchanged" as const };
  });
}

function fmt(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export function JsonDiff({ before, after }: { before: Json; after: Json }) {
  const rows = diff(before, after);
  if (!rows.length) {
    return <div className="text-[12px] text-muted-foreground">No field-level changes recorded.</div>;
  }
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="grid grid-cols-12 text-[10px] uppercase tracking-wider bg-bg-secondary text-muted-foreground px-3 py-2">
        <div className="col-span-3">Field</div>
        <div className="col-span-4">Before</div>
        <div className="col-span-4">After</div>
        <div className="col-span-1 text-right">Δ</div>
      </div>
      <div className="divide-y divide-border/60">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-12 px-3 py-2 text-[12px] font-mono items-start gap-2">
            <div className="col-span-3 text-foreground/80 break-all">{r.key}</div>
            <div className={`col-span-4 break-all ${r.kind === "removed" || r.kind === "changed" ? "text-destructive" : "text-muted-foreground"}`}>
              {r.kind === "added" ? "—" : <span className={r.kind !== "unchanged" ? "line-through opacity-80" : ""}>{fmt(r.before)}</span>}
            </div>
            <div className={`col-span-4 break-all ${r.kind === "added" || r.kind === "changed" ? "text-success" : "text-muted-foreground"}`}>
              {r.kind === "removed" ? "—" : fmt(r.after)}
            </div>
            <div className="col-span-1 text-right text-[10px] uppercase tracking-wider">
              {r.kind === "added" ? "+" : r.kind === "removed" ? "−" : r.kind === "changed" ? "~" : "="}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
