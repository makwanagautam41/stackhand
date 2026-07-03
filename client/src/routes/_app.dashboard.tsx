import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, FolderTree, Layers, Plus, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/lib/workspace-store";
import type { YamlFile } from "@/lib/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard · Stackhand" },
      { name: "description", content: "Overview of your stacks, containers and resource usage." },
    ],
  }),
});

function DashboardPage() {
  const { current, stacksByWs, activityByWs, treeByWs } = useWorkspaces();
  if (!current) return null;
  const stacks = stacksByWs[current.id] ?? [];
  const containers = stacks.flatMap((s) => s.containers);
  const running = containers.filter((c) => c.status === "running").length;
  const stopped = containers.filter((c) => c.status === "stopped").length;
  const activity = (activityByWs[current.id] ?? []).slice(0, 6);
  const tree = treeByWs[current.id];
  const diskBytes = tree ? sumTreeBytes(tree) : 0;
  const diskMB = diskBytes / (1024 * 1024);
  const diskLabel =
    diskMB >= 1024 ? `${(diskMB / 1024).toFixed(2)} GB` : `${diskMB.toFixed(2)} MB`;

  const cpuData = Array.from({ length: 12 }, (_, i) => ({
    t: `${i}m`,
    cpu: Math.round(20 + Math.random() * 60),
    mem: Math.round(30 + Math.random() * 50),
  }));

  const perContainer = containers.slice(0, 6).map((c) => ({
    name: c.name.slice(0, 10),
    cpu: c.cpu,
    mem: c.mem,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live overview of{" "}
            <span className="font-medium text-foreground">{current.name}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/yaml">
              <FolderTree className="mr-2 h-4 w-4" /> Browse folders
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/ai">
              <Bot className="mr-2 h-4 w-4" /> Ask AI
            </Link>
          </Button>
          <Button asChild>
            <Link to="/stacks">
              <Plus className="mr-2 h-4 w-4" /> New stack
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total stacks" value={stacks.length} sub="in this workspace" />
        <StatCard label="Running" value={running} sub="containers" tone="success" />
        <StatCard label="Stopped" value={stopped} sub="containers" tone="muted" />
        <StatCard label="Disk usage" value={diskLabel} sub={`${countFiles(tree)} files`} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Resource usage</CardTitle>
              <p className="text-xs text-muted-foreground">Last 12 minutes</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cpuData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="t" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="mem"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {activity.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                No activity yet
              </div>
            )}
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                <div className="flex-1">
                  <div className="truncate">{a.message}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {new Date(a.ts).toLocaleTimeString()} · {a.kind}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CPU / Memory per container</CardTitle>
          </CardHeader>
          <CardContent>
            {perContainer.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perContainer}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="cpu" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="mem" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stacks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stacks.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                <Layers className="mx-auto mb-2 h-5 w-5" />
                No stacks yet
              </div>
            )}
            {stacks.map((s) => (
              <Link
                key={s.id}
                to="/stacks/$stackId"
                params={{ stackId: s.id }}
                className="flex items-center justify-between rounded-md border p-2.5 text-sm hover:bg-accent"
              >
                <span className="truncate font-medium">{s.name}</span>
                <StatusBadge status={s.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "default" | "success" | "warning" | "muted";
}) {
  const dot =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "muted"
          ? "bg-slate-400"
          : "bg-primary";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {label}
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function sumTreeBytes(node: YamlFile): number {
  let total = node.isDir ? 0 : new Blob([node.content ?? ""]).size;
  for (const c of node.children ?? []) total += sumTreeBytes(c);
  return total;
}
function countFiles(node?: YamlFile): number {
  if (!node) return 0;
  let n = node.isDir ? 0 : 1;
  for (const c of node.children ?? []) n += countFiles(c);
  return n;
}

function EmptyChart() {
  return (
    <div className="grid h-[220px] place-items-center text-sm text-muted-foreground">
      No container data
    </div>
  );
}
