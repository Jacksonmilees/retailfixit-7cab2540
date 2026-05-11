import { createFileRoute, redirect } from "@tanstack/react-router";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/context";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return <Navigate to="/dashboard" />;
}

void redirect; // keep import linter happy if unused
