import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

function UsersPage() {
  const users = useQuery({ queryKey: ["users"], queryFn: () => api.listUsers() });
  if (users.isLoading) return <Skeleton className="h-96" />;
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead></TableRow></TableHeader>
          <TableBody>
            {users.data?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell><div className="flex gap-1">{u.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}</div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
