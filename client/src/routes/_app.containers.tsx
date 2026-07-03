import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Play,
  RefreshCw,
  RotateCw,
  Search,
  Square,
  Terminal,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/status-badge";
import { LogsViewer } from "@/components/logs-viewer";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/containers")({
  component: ContainersPage,
  head: () => ({
    meta: [
      { title: "Containers · Stackhand" },
      { name: "description", content: "All running and stopped Docker containers." },
    ],
  }),
});

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: { host?: number; container?: number; protocol: string }[];
  created: number;
}

function ContainersPage() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "running" | "exited" | "created">("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [logsFor, setLogsFor] = useState<string | null>(null);
  const [removeFor, setRemoveFor] = useState<DockerContainer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchContainers = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await api.listContainers();
      setContainers(data as any);
    } catch (e: any) {
      if (!silent) toast.error(`Failed to load containers: ${e.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContainers();
    // Poll every 5 seconds for live status updates
    intervalRef.current = setInterval(() => fetchContainers(true), 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    return containers.filter((c) => {
      const state = c.status ?? "";
      if (filter === "running" && state !== "running") return false;
      if (filter === "exited" && state !== "exited") return false;
      if (filter === "created" && state !== "created") return false;
      if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !c.image.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [containers, filter, q]);

  const runAction = async (c: DockerContainer, action: "start" | "stop" | "restart") => {
    setBusy((b) => ({ ...b, [c.id]: true }));
    try {
      if (action === "start") await api.startContainer(c.id);
      else if (action === "stop") await api.stopContainer(c.id);
      else await api.restartContainer(c.id);
      toast.success(`${c.name} ${action === "start" ? "started" : action === "stop" ? "stopped" : "restarted"}`);
      await fetchContainers(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy((b) => ({ ...b, [c.id]: false }));
    }
  };

  const removeContainer = async (c: DockerContainer) => {
    setBusy((b) => ({ ...b, [c.id]: true }));
    try {
      // Stop it first if running
      if (c.status === "running") await api.stopContainer(c.id);
      await api.removeContainer(c.id);
      toast.success(`${c.name} removed`);
      await fetchContainers(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy((b) => ({ ...b, [c.id]: false }));
      setRemoveFor(null);
    }
  };

  const runningCount = containers.filter((c) => c.status === "running").length;
  const stoppedCount = containers.filter((c) => c.status !== "running").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Containers</h1>
          <p className="text-sm text-muted-foreground">
            All Docker containers on this host.{" "}
            <span className="text-emerald-500 font-medium">{runningCount} running</span>
            {" · "}
            <span className="text-muted-foreground">{stoppedCount} stopped</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchContainers(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or image…"
              className="pl-8"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All ({containers.length})</TabsTrigger>
              <TabsTrigger value="running">Running ({runningCount})</TabsTrigger>
              <TabsTrigger value="exited">Exited ({stoppedCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading containers from Docker…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Ports</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium font-mono text-sm">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[180px] truncate">
                      {c.image}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.ports?.filter((p) => p.host).map((p, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">
                            {p.host}:{p.container}
                          </Badge>
                        ))}
                        {(!c.ports || c.ports.filter((p) => p.host).length === 0) && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ContainerStatusBadge status={c.status} state={c.state} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {c.status !== "running" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={busy[c.id]}
                            onClick={() => runAction(c, "start")}
                            title="Start"
                          >
                            {busy[c.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={busy[c.id]}
                            onClick={() => runAction(c, "stop")}
                            title="Stop"
                          >
                            {busy[c.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={busy[c.id]}
                          onClick={() => runAction(c, "restart")}
                          title="Restart"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setLogsFor(c.name)}
                          title="Logs"
                        >
                          <Terminal className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRemoveFor(c)}
                          title="Remove"
                          disabled={busy[c.id]}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        {containers.length === 0
                          ? "No Docker containers found. Start a stack to see containers here."
                          : "No containers match your filters."}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Logs sheet */}
      <Sheet open={!!logsFor} onOpenChange={(v) => !v && setLogsFor(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Logs · {logsFor}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{logsFor && <LogsViewer name={logsFor} />}</div>
        </SheetContent>
      </Sheet>

      {/* Remove confirm */}
      <AlertDialog open={!!removeFor} onOpenChange={(v) => !v && setRemoveFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeFor?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop and remove the container. The image will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeFor && removeContainer(removeFor)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ContainerStatusBadge({ status, state }: { status: string; state: string }) {
  const isRunning = status === "running";
  const isExited = status === "exited";
  const dot = isRunning
    ? "bg-emerald-500"
    : isExited
      ? "bg-slate-400"
      : "bg-amber-500";
  const label = state || status;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot} ${isRunning ? "animate-pulse" : ""}`} />
      <span className="text-xs font-mono capitalize">{label}</span>
    </div>
  );
}
