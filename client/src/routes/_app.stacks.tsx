import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Edit,
  Layers,
  Loader2,
  MoreHorizontal,
  Play,
  Plus,
  RotateCw,
  Search,
  Square,
  Terminal,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { LogsViewer } from "@/components/logs-viewer";
import { useWorkspaces } from "@/lib/workspace-store";
import { api } from "@/lib/api";
import type { Stack, StackStatus } from "@/lib/types";

const STARTER_TEMPLATES = [
  { id: "nginx", name: "Nginx", desc: "Reverse proxy / static files" },
  { id: "redis", name: "Redis", desc: "In-memory data store" },
  { id: "postgres", name: "Postgres", desc: "SQL database" },
  { id: "mysql", name: "MySQL", desc: "SQL database" },
  { id: "mongo", name: "MongoDB", desc: "Document database" },
  { id: "blank", name: "Custom (blank)", desc: "Empty compose file" },
];

export const Route = createFileRoute("/_app/stacks")({
  component: StacksPage,
  head: () => ({
    meta: [
      { title: "Stacks · Stackhand" },
      { name: "description", content: "All Docker compose stacks in your workspace." },
    ],
  }),
});

function StacksPage() {
  const { current, stacksByWs, updateStack, deleteStack, addStack, refreshStacks } = useWorkspaces();
  const [filter, setFilter] = useState<"all" | StackStatus>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [logsFor, setLogsFor] = useState<Stack | null>(null);
  const [deleteFor, setDeleteFor] = useState<Stack | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  if (!current) return null;
  const stacks = stacksByWs[current.id] ?? [];

  const filtered = useMemo(() => {
    return stacks.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [stacks, filter, q]);

  const runAction = async (stack: Stack, action: "start" | "stop" | "restart") => {
    setBusy((b) => ({ ...b, [stack.id]: true }));
    try {
      if (action === "start") await api.composeUp(stack.id);
      else if (action === "stop") await api.composeDown(stack.id);
      else await api.composeRestart(stack.id);
      await refreshStacks();
      toast.success(`${stack.name} ${action === "start" ? "started" : action === "stop" ? "stopped" : "restarted"}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy((b) => ({ ...b, [stack.id]: false }));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stacks</h1>
          <p className="text-sm text-muted-foreground">
            Manage your compose stacks in {current.name}
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New stack
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search stacks…"
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
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <div className="text-sm font-medium">No stacks match</div>
            <div className="text-xs text-muted-foreground">
              Try clearing filters or create your first stack.
            </div>
            <Button className="mt-4" onClick={() => setNewOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New stack
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Last modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        to="/stacks/$stackId"
                        params={{ stackId: s.id }}
                        className="font-medium hover:text-primary"
                      >
                        {s.name}
                      </Link>
                      <div className="text-mono text-xs text-muted-foreground">
                        {s.yamlPath}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.services.map((sv) => (
                          <Badge key={sv} variant="secondary" className="font-normal">
                            {sv}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.lastModified}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {s.status !== "running" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={busy[s.id]}
                            onClick={() => runAction(s, "start")}
                            title="Start"
                          >
                            {busy[s.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={busy[s.id]}
                            onClick={() => runAction(s, "stop")}
                            title="Stop"
                          >
                            {busy[s.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={busy[s.id]}
                          onClick={() => runAction(s, "restart")}
                          title="Restart"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setLogsFor(s)}
                          title="Logs"
                        >
                          <Terminal className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to="/stacks/$stackId" params={{ stackId: s.id }}>
                                <Edit className="mr-2 h-4 w-4" /> Edit YAML
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteFor(s)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Logs sheet */}
      <Sheet open={!!logsFor} onOpenChange={(v) => !v && setLogsFor(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Logs · {logsFor?.name}</SheetTitle>
            <SheetDescription>Live stream from Docker</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{logsFor && <LogsViewer name={logsFor.name} stackId={logsFor.id} />}</div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteFor} onOpenChange={(v) => !v && setDeleteFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteFor?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the stack and its YAML reference. Running containers will be stopped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteFor) {
                  try {
                    await deleteStack(current.id, deleteFor.id);
                    toast.success(`${deleteFor.name} deleted`);
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }
                setDeleteFor(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewStackDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreate={async (stack) => {
          try {
            const created = await api.createStack(current.id, { name: stack.name, yaml: stack.yaml, folderName: stack.name.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
            addStack(current.id, { ...created, workspaceId: current.id });
            await refreshStacks();
            toast.success(`Stack ${stack.name} created`);
          } catch (e: any) {
            toast.error(e.message);
          }
        }}
      />
    </div>
  );
}

type PortRow = { host: string; container: string; protocol: "tcp" | "udp" };
type EnvRow = { key: string; value: string };
type VolRow = { host: string; container: string };

function buildYaml(opts: {
  name: string;
  service: string;
  image: string;
  ports: PortRow[];
  env: EnvRow[];
  volumes: VolRow[];
  restart: string;
  network: string;
  command: string;
}) {
  const svc = opts.service.trim() || "app";
  const lines: string[] = [];
  lines.push(`version: "3.9"`);
  lines.push(`services:`);
  lines.push(`  ${svc}:`);
  if (opts.image.trim()) lines.push(`    image: ${opts.image.trim()}`);
  if (opts.name.trim()) lines.push(`    container_name: ${opts.name.trim()}`);
  if (opts.restart && opts.restart !== "no") lines.push(`    restart: ${opts.restart}`);
  const ports = opts.ports.filter((p) => p.host && p.container);
  if (ports.length) {
    lines.push(`    ports:`);
    ports.forEach((p) =>
      lines.push(`      - "${p.host}:${p.container}${p.protocol === "udp" ? "/udp" : ""}"`),
    );
  }
  const env = opts.env.filter((e) => e.key);
  if (env.length) {
    lines.push(`    environment:`);
    env.forEach((e) => lines.push(`      ${e.key}: ${e.value}`));
  }
  const vols = opts.volumes.filter((v) => v.host && v.container);
  if (vols.length) {
    lines.push(`    volumes:`);
    vols.forEach((v) => lines.push(`      - ${v.host}:${v.container}`));
  }
  if (opts.command.trim()) lines.push(`    command: ${opts.command.trim()}`);
  if (opts.network.trim()) {
    lines.push(`    networks:`);
    lines.push(`      - ${opts.network.trim()}`);
    lines.push(`networks:`);
    lines.push(`  ${opts.network.trim()}:`);
    lines.push(`    driver: bridge`);
  }
  return lines.join("\n") + "\n";
}

function NewStackDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (stack: Stack) => void;
}) {
  const [template, setTemplate] = useState("nginx");
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("/stacks");
  const [service, setService] = useState("app");
  const [image, setImage] = useState("nginx:alpine");
  const [ports, setPorts] = useState<PortRow[]>([
    { host: "8080", container: "80", protocol: "tcp" },
  ]);
  const [env, setEnv] = useState<EnvRow[]>([]);
  const [volumes, setVolumes] = useState<VolRow[]>([]);
  const [restart, setRestart] = useState("unless-stopped");
  const [network, setNetwork] = useState("");
  const [command, setCommand] = useState("");
  const [yamlOverride, setYamlOverride] = useState<string | null>(null);

  // Apply template defaults when template changes.
  const applyTemplate = (id: string) => {
    setTemplate(id);
    setYamlOverride(null);
    if (id === "blank") {
      setService("app");
      setImage("");
      setPorts([]);
      setEnv([]);
      setVolumes([]);
      setCommand("");
      return;
    }
    const defaults: Record<string, { service: string; image: string; ports: PortRow[]; env: EnvRow[]; volumes: VolRow[] }> = {
      nginx: {
        service: "nginx",
        image: "nginx:alpine",
        ports: [{ host: "8080", container: "80", protocol: "tcp" }],
        env: [],
        volumes: [{ host: "./html", container: "/usr/share/nginx/html" }],
      },
      redis: {
        service: "redis",
        image: "redis:7-alpine",
        ports: [{ host: "6379", container: "6379", protocol: "tcp" }],
        env: [],
        volumes: [{ host: "redis-data", container: "/data" }],
      },
      postgres: {
        service: "postgres",
        image: "postgres:16",
        ports: [{ host: "5432", container: "5432", protocol: "tcp" }],
        env: [
          { key: "POSTGRES_USER", value: "admin" },
          { key: "POSTGRES_PASSWORD", value: "changeme" },
          { key: "POSTGRES_DB", value: "app" },
        ],
        volumes: [{ host: "pg-data", container: "/var/lib/postgresql/data" }],
      },
      mysql: {
        service: "mysql",
        image: "mysql:8",
        ports: [{ host: "3306", container: "3306", protocol: "tcp" }],
        env: [{ key: "MYSQL_ROOT_PASSWORD", value: "changeme" }],
        volumes: [],
      },
      mongo: {
        service: "mongo",
        image: "mongo:7",
        ports: [{ host: "27017", container: "27017", protocol: "tcp" }],
        env: [],
        volumes: [{ host: "mongo-data", container: "/data/db" }],
      },
    };
    const d = defaults[id];
    if (d) {
      setService(d.service);
      setImage(d.image);
      setPorts(d.ports);
      setEnv(d.env);
      setVolumes(d.volumes);
      setCommand("");
    }
  };

  const generated = useMemo(
    () =>
      buildYaml({
        name: name || service || "app",
        service: service || "app",
        image,
        ports,
        env,
        volumes,
        restart,
        network,
        command,
      }),
    [name, service, image, ports, env, volumes, restart, network, command],
  );
  const yaml = yamlOverride ?? generated;

  const reset = () => {
    setName("");
    setFolder("/stacks");
    setYamlOverride(null);
    applyTemplate("nginx");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>New stack</DialogTitle>
          <DialogDescription>
            Configure services, ports, env, and volumes. Preview and edit the YAML live.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {/* LEFT — form */}
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-service"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Folder</label>
                <Input
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="text-mono"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Template</label>
              <Select value={template} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STARTER_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="basics">
              <TabsList className="w-full">
                <TabsTrigger value="basics" className="flex-1">Basics</TabsTrigger>
                <TabsTrigger value="ports" className="flex-1">Ports</TabsTrigger>
                <TabsTrigger value="env" className="flex-1">Env</TabsTrigger>
                <TabsTrigger value="volumes" className="flex-1">Volumes</TabsTrigger>
                <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basics" className="space-y-2 pt-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Service</label>
                    <Input value={service} onChange={(e) => { setYamlOverride(null); setService(e.target.value); }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Restart</label>
                    <Select value={restart} onValueChange={(v) => { setYamlOverride(null); setRestart(v); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">no</SelectItem>
                        <SelectItem value="always">always</SelectItem>
                        <SelectItem value="on-failure">on-failure</SelectItem>
                        <SelectItem value="unless-stopped">unless-stopped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Image</label>
                  <Input
                    value={image}
                    onChange={(e) => { setYamlOverride(null); setImage(e.target.value); }}
                    placeholder="nginx:alpine"
                    className="text-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Command (optional)</label>
                  <Input
                    value={command}
                    onChange={(e) => { setYamlOverride(null); setCommand(e.target.value); }}
                    placeholder='e.g. ["nginx","-g","daemon off;"]'
                    className="text-mono"
                  />
                </div>
              </TabsContent>

              <TabsContent value="ports" className="space-y-2 pt-3">
                {ports.length === 0 && <p className="text-xs text-muted-foreground">No ports mapped.</p>}
                {ports.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={p.host}
                      onChange={(e) => { setYamlOverride(null); setPorts((rs) => rs.map((r, j) => j === i ? { ...r, host: e.target.value } : r)); }}
                      placeholder="host"
                      className="text-mono"
                    />
                    <span className="text-muted-foreground">:</span>
                    <Input
                      value={p.container}
                      onChange={(e) => { setYamlOverride(null); setPorts((rs) => rs.map((r, j) => j === i ? { ...r, container: e.target.value } : r)); }}
                      placeholder="container"
                      className="text-mono"
                    />
                    <Select value={p.protocol} onValueChange={(v) => { setYamlOverride(null); setPorts((rs) => rs.map((r, j) => j === i ? { ...r, protocol: v as "tcp" | "udp" } : r)); }}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tcp">tcp</SelectItem>
                        <SelectItem value="udp">udp</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" onClick={() => { setYamlOverride(null); setPorts((rs) => rs.filter((_, j) => j !== i)); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => { setYamlOverride(null); setPorts((rs) => [...rs, { host: "", container: "", protocol: "tcp" }]); }}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add port
                </Button>
              </TabsContent>

              <TabsContent value="env" className="space-y-2 pt-3">
                {env.length === 0 && <p className="text-xs text-muted-foreground">No environment variables.</p>}
                {env.map((e, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={e.key}
                      onChange={(ev) => { setYamlOverride(null); setEnv((rs) => rs.map((r, j) => j === i ? { ...r, key: ev.target.value } : r)); }}
                      placeholder="KEY"
                      className="text-mono"
                    />
                    <span className="text-muted-foreground">=</span>
                    <Input
                      value={e.value}
                      onChange={(ev) => { setYamlOverride(null); setEnv((rs) => rs.map((r, j) => j === i ? { ...r, value: ev.target.value } : r)); }}
                      placeholder="value"
                      className="text-mono"
                    />
                    <Button size="icon" variant="ghost" onClick={() => { setYamlOverride(null); setEnv((rs) => rs.filter((_, j) => j !== i)); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => { setYamlOverride(null); setEnv((rs) => [...rs, { key: "", value: "" }]); }}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add variable
                </Button>
              </TabsContent>

              <TabsContent value="volumes" className="space-y-2 pt-3">
                {volumes.length === 0 && <p className="text-xs text-muted-foreground">No volumes mounted.</p>}
                {volumes.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={v.host}
                      onChange={(e) => { setYamlOverride(null); setVolumes((rs) => rs.map((r, j) => j === i ? { ...r, host: e.target.value } : r)); }}
                      placeholder="host/named"
                      className="text-mono"
                    />
                    <span className="text-muted-foreground">:</span>
                    <Input
                      value={v.container}
                      onChange={(e) => { setYamlOverride(null); setVolumes((rs) => rs.map((r, j) => j === i ? { ...r, container: e.target.value } : r)); }}
                      placeholder="/in/container"
                      className="text-mono"
                    />
                    <Button size="icon" variant="ghost" onClick={() => { setYamlOverride(null); setVolumes((rs) => rs.filter((_, j) => j !== i)); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => { setYamlOverride(null); setVolumes((rs) => [...rs, { host: "", container: "" }]); }}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add volume
                </Button>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-2 pt-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Network name (optional)</label>
                  <Input
                    value={network}
                    onChange={(e) => { setYamlOverride(null); setNetwork(e.target.value); }}
                    placeholder="app-net"
                    className="text-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave blank to use the default compose network.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT — YAML preview / editor */}
          <div className="flex flex-col">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-xs font-medium">
                YAML {yamlOverride !== null && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">edited</Badge>}
              </div>
              {yamlOverride !== null && (
                <Button size="sm" variant="ghost" onClick={() => setYamlOverride(null)}>
                  Reset to form
                </Button>
              )}
            </div>
            <textarea
              value={yaml}
              onChange={(e) => setYamlOverride(e.target.value)}
              spellCheck={false}
              className="scrollbar-thin h-[420px] w-full flex-1 resize-none rounded-md border bg-muted/30 p-3 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              const finalName = name.trim();
              const stack: Stack = {
                id: crypto.randomUUID(),
                workspaceId: "",
                name: finalName,
                yamlPath: `${folder.replace(/\/$/, "")}/${finalName}/docker-compose.yml`,
                status: "stopped",
                services: [service || "app"],
                containers: [
                  {
                    id: crypto.randomUUID(),
                    name: finalName,
                    image: image || `${service || "app"}:latest`,
                    status: "stopped",
                    ports: ports
                      .filter((p) => p.host && p.container)
                      .map((p) => ({
                        host: Number(p.host) || 0,
                        container: Number(p.container) || 0,
                        protocol: p.protocol,
                      })),
                    volumes: volumes
                      .filter((v) => v.host && v.container)
                      .map((v) => ({ host: v.host, container: v.container })),
                    env: env
                      .filter((e) => e.key)
                      .map((e) => ({ key: e.key, value: e.value, secret: false })),
                    cpu: 0,
                    mem: 0,
                  },
                ],
                lastModified: "just now",
                yaml,
              };
              onCreate(stack);
              onOpenChange(false);
            }}
          >
            Create stack
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

