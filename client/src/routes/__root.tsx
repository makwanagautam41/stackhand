import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "@/lib/theme-provider";
import { WorkspaceProvider, getStoredToken } from "@/lib/workspace-store";

const STORAGE_KEY = "stackhand-state-v2";

function getApiBase(): string {
  const configured =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    process.env.API_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return "/api";
  return "http://127.0.0.1:4000/api";
}

async function fetchWorkspaces(): Promise<{ id: string; name: string; color: string }[]> {
  const token = getStoredToken();
  const res = await fetch(`${getApiBase()}/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((w: any) => ({ id: w.id, name: w.name, color: w.color || "#6366f1" }));
}

function switchWorkspace(id: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      p.currentId = id;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    }
  } catch {}
  window.location.href = "/";
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  useEffect(() => {
    fetchWorkspaces().then((ws) => {
      setWorkspaces(ws);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        {!loading && workspaces.length > 1 && (
          <div className="mt-6 text-left">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Switch to another workspace:
            </p>
            <div className="space-y-1">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => switchWorkspace(w.id)}
                  className="w-full flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: w.color }}
                  />
                  <span className="truncate">{w.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
          {!loading && workspaces.length > 1 && (
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                window.location.href = "/onboarding";
              }}
              className="inline-flex items-center justify-center rounded-md border border-destructive/50 bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              Reset workspace state
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Stackhand — Docker & YAML stack manager" },
      {
        name: "description",
        content:
          "Stackhand is a personal Docker/YAML stack manager. Organize workspaces, edit compose files, monitor containers, and get AI help — all in one clean interface.",
      },
      { name: "author", content: "Stackhand" },
      { property: "og:title", content: "Stackhand — Docker & YAML stack manager" },
      {
        property: "og:description",
        content:
          "Organize Docker compose stacks across workspaces with a fast, keyboard-friendly UI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/docker.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body onContextMenu={(e) => e.preventDefault()}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WorkspaceProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </WorkspaceProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
