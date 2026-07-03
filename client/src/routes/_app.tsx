import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
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
  const { hydrated, workspaces } = useWorkspaces();
  const navigate = useNavigate();

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
          <main className="min-w-0 flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
          <StatusBar />
        </SidebarInset>
      </div>
      <ShortcutsDialog />
    </SidebarProvider>
  );
}

