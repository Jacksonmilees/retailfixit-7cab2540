import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/vendors")({
  component: VendorsList,
});

function VendorsList() {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const vendors = useQuery({
    queryKey: ["vendors", { search, page }],
    queryFn: () => api.listVendors({ search, page, pageSize: 20 }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search vendors…" className="pl-8" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Regions</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">Load</TableHead>
                <TableHead className="text-right">Avg response</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.isLoading && <TableRow><TableCell colSpan={7}><Skeleton className="h-24" /></TableCell></TableRow>}
              {vendors.data?.items.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{v.name}</div>
                    <div className="text-xs text-muted-foreground">{v.email}</div>
                  </TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{v.categories.map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}</div></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{v.regions.join(", ")}</TableCell>
                  <TableCell className="text-right tabular-nums"><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{v.rating}</span></TableCell>
                  <TableCell className="text-right tabular-nums">{v.activeJobs}/{v.capacity}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{v.avgResponseMinutes}m</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={v.status === "active" ? "border-success/40 text-success" : v.status === "paused" ? "border-warning/40 text-foreground" : "border-destructive/40 text-destructive"}>{v.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {vendors.data && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {vendors.data.page} · {vendors.data.total} total</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded border border-border disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="px-3 py-1 rounded border border-border disabled:opacity-50" disabled={page * vendors.data.pageSize >= vendors.data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
