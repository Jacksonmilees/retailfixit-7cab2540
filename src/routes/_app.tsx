import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/context";
import { AppShell } from "@/components/layout/AppShell";
import { FullPageLoader } from "@/components/common/FluentSpinner";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" />;
  return <AppShell />;
}
