import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconBrandDocker, IconCircleFilled } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { DockerStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/setup")({
  component: SetupPage,
  head: () => ({
    meta: [
      { title: "Setup · Stackhand" },
      { name: "description", content: "Docker engine status and setup." },
    ],
  }),
});

function SetupPage() {
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await api.dockerStatus();
      setStatus(s);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Setup</h1>
        <p className="text-sm text-muted-foreground">
          Docker engine status and environment configuration.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconBrandDocker className="h-4 w-4" stroke={1.75} />
            Docker Engine
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn(
              "inline-block h-3 w-3 rounded-full",
              status?.running ? "bg-emerald-500 animate-pulse" : "bg-red-500",
            )} />
            <span className="text-lg font-semibold">
              {loading ? "Checking..." : status?.running ? "Running" : "Not Running"}
            </span>
          </div>
          {status?.version && (
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              v{status.version}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Containers
          </div>
          <div className="mt-2 text-lg font-semibold">{status?.containers ?? "—"}</div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {status?.runningContainers ?? 0} running
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Images
          </div>
          <div className="mt-2 text-lg font-semibold">{status?.images ?? "—"}</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Platform
          </div>
          <div className="mt-2 text-lg font-semibold truncate">{status?.os ?? "—"}</div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {status?.architecture ?? ""}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 font-mono text-sm font-medium">Connection Details</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-xs text-muted-foreground w-32">Socket</span>
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
              {status?.running ? "/var/run/docker.sock" : "Not connected"}
            </code>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-xs text-muted-foreground w-32">API Version</span>
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
              {status?.version ?? "—"}
            </code>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              Error: {error}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
