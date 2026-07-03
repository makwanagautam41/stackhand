import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useWorkspaces } from "@/lib/workspace-store";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { hydrated, workspaces } = useWorkspaces();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;
    if (workspaces.length === 0) navigate({ to: "/onboarding" });
    else navigate({ to: "/dashboard" });
  }, [hydrated, workspaces.length, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading Stackhand…</span>
      </div>
    </div>
  );
}
