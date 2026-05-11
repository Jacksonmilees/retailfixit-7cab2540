import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/context";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    const { FullPageLoader } = require("@/components/common/FluentSpinner");
    return <FullPageLoader />;
  }
  if (!user) return <Navigate to="/login" />;
  return <AppShell />;
}
