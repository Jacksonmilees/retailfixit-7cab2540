import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Building2, MapPin, FileDown } from "lucide-react";
import { TableSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/PageHeader";
import { generateCustomerReport } from "@/lib/reports/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/customers")({
  component: CustomersPage,
});

interface Customer { name: string; jobs: number; cities: string[]; lastJob?: string }

function CustomersPage() {
  const jobs = useQuery({ queryKey: ["jobs-all"], queryFn: () => api.listJobs({ pageSize: 500 }) });
  const [search, setSearch] = React.useState("");

  const customers = React.useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();
    for (const j of jobs.data?.items ?? []) {
      const c = map.get(j.customerName) ?? { name: j.customerName, jobs: 0, cities: [], lastJob: undefined };
      c.jobs++;
      if (!c.cities.includes(j.city)) c.cities.push(j.city);
      if (!c.lastJob || new Date(j.createdAt) > new Date(c.lastJob)) c.lastJob = j.createdAt;
      map.set(j.customerName, c);
    }
    return Array.from(map.values()).sort((a, b) => b.jobs - a.jobs);
  }, [jobs.data]);

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers…" className="pl-9 h-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardContent className="p-0">
          {jobs.isLoading ? <div className="p-4"><TableSkeleton rows={8} cols={5} /></div> : filtered.length === 0 ? (
            <EmptyState icon={Building2} title="No customers yet" description="Customer accounts appear automatically as jobs are created." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Last activity</TableHead>
                  <TableHead className="text-right w-[100px]">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((c) => (
                  <TableRow key={c.name}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Building2 className="h-4 w-4" /></div>
                        <div>
                          <div className="text-[13px] font-medium">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground">Account · enterprise</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.cities.slice(0, 3).map((city) => (
                          <Badge key={city} variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-1" />{city}</Badge>
                        ))}
                        {c.cities.length > 3 && <Badge variant="outline" className="text-[10px]">+{c.cities.length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{c.jobs}</TableCell>
                    <TableCell className="text-right text-[11px] text-muted-foreground">
                      {c.lastJob ? new Date(c.lastJob).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 px-2 rounded-md" onClick={() => {
                        const cjobs = (jobs.data?.items ?? []).filter(j => j.customerName === c.name);
                        generateCustomerReport(c.name, cjobs);
                        toast.success(`Report for ${c.name} downloaded`);
                      }}><FileDown className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
