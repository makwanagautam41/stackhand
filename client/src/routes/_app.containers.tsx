import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Play, RotateCw, Search, Square, Terminal } from "lucide-react";
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
import { StatusBadge } from "@/components/status-badge";
import { LogsViewer } from "@/components/logs-viewer";
import { useWorkspaces } from "@/lib/workspace-store";
import type { ContainerStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/containers")({
  component: ContainersPage,
  head: () => ({
    meta: [
      { title: "Containers · Stackhand" },
      { name: "description", content: "All running and stopped containers." },
    ],
  }),
});

function ContainersPage() {
  const { current, stacksByWs, updateStack } = useWorkspaces();
  const [filter, setFilter] = useState<"all" | ContainerStatus>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [logsFor, setLogsFor] = useState<string | null>(null);

  if (!current) return null;
  const stacks = stacksByWs[current.id] ?? [];
  const rows = useMemo(() => {
    return stacks.flatMap((s) =>
      s.containers.map((c) => ({ stack: s, container: c })),
    );
  }, [stacks]);

  const filtered = rows.filter(({ container }) => {
    if (filter !== "all" && container.status !== filter) return false;
    if (q && !container.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const runContainer = (
    stackId: string,
    cid: string,
    action: "start" | "stop" | "restart",
  ) => {
    setBusy((b) => ({ ...b, [cid]: true }));
    setTimeout(() => {
      const stack = stacks.find((s) => s.id === stackId);
      if (!stack) return;
      const next: ContainerStatus = action === "stop" ? "stopped" : "running";
      updateStack(current.id, stackId, {
        containers: stack.containers.map((c) =>
          c.id === cid ? { ...c, status: next } : c,
        ),
      });
      setBusy((b) => ({ ...b, [cid]: false }));
      toast.success(`Container ${action}`);
    }, 1200);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Containers</h1>
        <p className="text-sm text-muted-foreground">
          Everything running across your stacks.
        </p>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search containers…"
              className="pl-8"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="running">Running</TabsTrigger>
              <TabsTrigger value="stopped">Stopped</TabsTrigger>
              <TabsTrigger value="error">Error</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Stack</TableHead>
                <TableHead>Ports</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(({ stack, container: c }) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-mono text-xs">{c.image}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {stack.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.ports.map((p, i) => (
                        <Badge key={i} variant="secondary" className="text-mono">
                          {p.host}:{p.container}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {c.status !== "running" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={busy[c.id]}
                          onClick={() => runContainer(stack.id, c.id, "start")}
                        >
                          {busy[c.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={busy[c.id]}
                          onClick={() => runContainer(stack.id, c.id, "stop")}
                        >
                          {busy[c.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => runContainer(stack.id, c.id, "restart")}
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setLogsFor(c.name)}
                      >
                        <Terminal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No containers match your filters.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Sheet open={!!logsFor} onOpenChange={(v) => !v && setLogsFor(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Logs · {logsFor}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{logsFor && <LogsViewer name={logsFor} />}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
