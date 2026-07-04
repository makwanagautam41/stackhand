import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { StatusBar } from "@/components/status-bar";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { FullPageLoader } from "@/components/loader";
import { useWorkspaces } from "@/lib/workspace-store";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { hydrated, workspaces, current, error, refresh, loading } = useWorkspaces();
  const navigate = useNavigate();
  const [dismissedError, setDismissedError] = useState(false);

  useEffect(() => {
    if (hydrated && workspaces.length === 0) navigate({ to: "/onboarding" });
  }, [hydrated, workspaces.length, navigate]);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-background">
        <FullPageLoader label="restoring workspace…" />
      </div>
    );
  }
  if (workspaces.length === 0) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          {error && !dismissedError && (
            <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-2 text-sm flex items-center gap-3">
              <span className="text-red-600 dark:text-red-400 flex-1">
                {error}
              </span>
              <button
                onClick={() => refresh()}
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline shrink-0"
              >
                Retry
              </button>
              <button
                onClick={() => setDismissedError(true)}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
          <main className="min-w-0 flex-1 p-4 sm:p-6">
            {loading && !current ? <FullPageLoader label="loading…" /> : <Outlet />}
          </main>
          <StatusBar />
        </SidebarInset>
      </div>
      <ShortcutsDialog />
    </SidebarProvider>
  );
}

