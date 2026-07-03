import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  IconArrowLeft,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconTerminal2,
  IconGitCompare,
  IconHeart,
  IconAdjustmentsHorizontal,
  IconHistory,
  IconBox,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/status-badge";
import { YamlEditor } from "@/components/yaml-editor";
import { YamlDiff } from "@/components/yaml-diff";
import { HealthPanel } from "@/components/health-panel";
import { ResourceLimitsEditor } from "@/components/resource-limits";
import { YamlHistory } from "@/components/yaml-history";
import { LogsViewer } from "@/components/logs-viewer";
import { useWorkspaces } from "@/lib/workspace-store";
import type { ContainerStatus, YamlVersion } from "@/lib/types";

export const Route = createFileRoute("/_app/stacks/$stackId")({
  component: StackDetail,
});

function StackDetail() {
  const { stackId } = Route.useParams();
  const navigate = useNavigate();
  const {
    current,
    stacksByWs,
    updateStack,
    applyStackYaml,
    pushYamlVersion,
    yamlHistoryByStack,
    pushActivity,
    refreshStacks,
  } = useWorkspaces();
  const [showSecrets, setShowSecrets] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [logsFor, setLogsFor] = useState<{ name: string; containerId?: string } | null>(null);

  if (!current) return null;
  const stack = (stacksByWs[current.id] ?? []).find((s) => s.id === stackId);
  if (!stack) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Stack not found.</p>
        <Button variant="ghost" className="mt-2" onClick={() => navigate({ to: "/stacks" })}>
          Back
        </Button>
      </div>
    );
  }

  const history = yamlHistoryByStack[stack.id] ?? [];
  const hasPending = (stack.runningYaml ?? "") !== stack.yaml;

  const runContainer = async (cid: string, action: "start" | "stop" | "restart") => {
    setBusy((b) => ({ ...b, [cid]: true }));
    try {
      if (action === "start") await api.startContainer(cid);
      else if (action === "stop") await api.stopContainer(cid);
      else await api.restartContainer(cid);
      await refreshStacks();
      pushActivity(current.id, {
        kind: action === "stop" ? "stop" : "start",
        message: `${action} ${stack.containers.find((c) => c.id === cid)?.name}`,
      });
      toast.success(`Container ${action}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy((b) => ({ ...b, [cid]: false }));
    }
  };

  const saveYaml = (v: string) => {
    const version: YamlVersion = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      message: "edit via YAML editor",
      content: stack.yaml,
    };
    pushYamlVersion(stack.id, version);
    updateStack(current.id, stack.id, { yaml: v, lastModified: "just now" });
    pushActivity(current.id, { kind: "edit", message: `edited ${stack.name}/docker-compose.yml` });
  };

  const applyPending = () => {
    applyStackYaml(current.id, stack.id);
    pushActivity(current.id, { kind: "edit", message: `applied changes to ${stack.name}` });
    toast.success("Applied changes to running stack");
  };

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 rounded-md">
          <Link to="/stacks">
            <IconArrowLeft className="mr-1.5 h-4 w-4" stroke={1.75} /> All stacks
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{stack.name}</h1>
          <StatusBadge status={stack.status} />
          {hasPending && (
            <Badge variant="outline" className="font-mono text-[10px] uppercase border-amber-500/40 text-amber-500">
              pending changes
            </Badge>
          )}
        </div>
        <p className="font-mono text-xs text-muted-foreground">{stack.yamlPath}</p>
      </div>

      <Tabs defaultValue="containers">
        <TabsList className="rounded-md">
          <TabsTrigger value="containers" className="rounded-md font-mono text-xs">
            <IconBox className="mr-1.5 h-3.5 w-3.5" stroke={1.75} /> Containers
          </TabsTrigger>
          <TabsTrigger value="yaml" className="rounded-md font-mono text-xs">
            <IconDeviceFloppy className="mr-1.5 h-3.5 w-3.5" stroke={1.75} /> YAML
          </TabsTrigger>
          <TabsTrigger value="diff" className="rounded-md font-mono text-xs">
            <IconGitCompare className="mr-1.5 h-3.5 w-3.5" stroke={1.75} /> Diff
            {hasPending && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-500" />}
          </TabsTrigger>
          <TabsTrigger value="health" className="rounded-md font-mono text-xs">
            <IconHeart className="mr-1.5 h-3.5 w-3.5" stroke={1.75} /> Health
          </TabsTrigger>
          <TabsTrigger value="limits" className="rounded-md font-mono text-xs">
            <IconAdjustmentsHorizontal className="mr-1.5 h-3.5 w-3.5" stroke={1.75} /> Limits
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-md font-mono text-xs">
            <IconHistory className="mr-1.5 h-3.5 w-3.5" stroke={1.75} /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="containers" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Containers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stack.containers.map((c) => (
                <div key={c.id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-sm font-medium">{c.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{c.image}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      <div className="flex gap-1">
                        {c.status !== "running" ? (
                          <Button size="icon" variant="ghost" className="rounded-md" disabled={busy[c.id]} onClick={() => runContainer(c.id, "start")}>
                            {busy[c.id] ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconPlayerPlay className="h-4 w-4" stroke={1.75} />}
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" className="rounded-md" disabled={busy[c.id]} onClick={() => runContainer(c.id, "stop")}>
                            {busy[c.id] ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconPlayerStop className="h-4 w-4" stroke={1.75} />}
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="rounded-md" onClick={() => runContainer(c.id, "restart")}>
                          <IconRefresh className="h-4 w-4" stroke={1.75} />
                        </Button>
                        <Button size="icon" variant="ghost" className="rounded-md" onClick={() => setLogsFor({ name: c.name, containerId: c.id })}>
                          <IconTerminal2 className="h-4 w-4" stroke={1.75} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Ports</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.ports.map((p, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-[10px]">
                            {p.host}:{p.container}/{p.protocol}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Volumes</div>
                      <div className="mt-1 space-y-1">
                        {c.volumes.map((v, i) => (
                          <div key={i} className="font-mono text-xs">
                            {v.host} → {v.container}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Env vars
                        <button type="button" className="hover:text-foreground" onClick={() => setShowSecrets((v) => !v)}>
                          {showSecrets ? <IconEyeOff className="h-3.5 w-3.5" stroke={1.75} /> : <IconEye className="h-3.5 w-3.5" stroke={1.75} />}
                        </button>
                      </div>
                      <div className="mt-1 space-y-1">
                        {c.env.map((e) => (
                          <div key={e.key} className="font-mono text-xs">
                            <span className="text-primary">{e.key}</span>=
                            {e.secret && !showSecrets ? "•".repeat(Math.min(e.value.length, 12)) : e.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yaml" className="pt-4">
          <YamlEditor value={stack.yaml} onSave={saveYaml} />
        </TabsContent>

        <TabsContent value="diff" className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {hasPending ? "Compare your edited YAML with the running state before applying." : "No differences — file matches running state."}
            </p>
            <Button onClick={applyPending} disabled={!hasPending} className="rounded-md">
              Apply changes
            </Button>
          </div>
          <YamlDiff oldValue={stack.runningYaml ?? ""} newValue={stack.yaml} />
        </TabsContent>

        <TabsContent value="health" className="pt-4">
          <HealthPanel containers={stack.containers} />
        </TabsContent>

        <TabsContent value="limits" className="pt-4">
          <ResourceLimitsEditor
            containers={stack.containers}
            onChange={(next) => updateStack(current.id, stack.id, { containers: next })}
          />
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <YamlHistory
            versions={history}
            onRevert={(v) => {
              const bak: YamlVersion = {
                id: crypto.randomUUID(),
                ts: new Date().toISOString(),
                message: "before revert",
                content: stack.yaml,
              };
              pushYamlVersion(stack.id, bak);
              updateStack(current.id, stack.id, { yaml: v.content, lastModified: "just now" });
            }}
          />
        </TabsContent>
      </Tabs>

      <Sheet open={!!logsFor} onOpenChange={(v) => !v && setLogsFor(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="font-mono">Logs · {logsFor?.name}</SheetTitle>
            <SheetDescription>Real container logs</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{logsFor && <LogsViewer name={logsFor.name} containerId={logsFor.containerId} stackId={stack.id} />}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
