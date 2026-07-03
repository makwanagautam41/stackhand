import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { IconNetwork } from "@tabler/icons-react";
import { useWorkspaces } from "@/lib/workspace-store";

export const Route = createFileRoute("/_app/network")({
  component: NetworkPage,
  head: () => ({ meta: [{ title: "Network · Stackhand" }] }),
});

function NetworkPage() {
  const { current, stacksByWs } = useWorkspaces();
  const stacks = current ? stacksByWs[current.id] ?? [] : [];
  const containers = stacks.flatMap((s) => s.containers);

  // network -> containers[]
  const networks = useMemo(() => {
    const map: Record<string, { name: string; containers: string[] }> = {};
    containers.forEach((c) => {
      (c.networks ?? ["default"]).forEach((n) => {
        map[n] ??= { name: n, containers: [] };
        map[n].containers.push(c.name);
      });
    });
    return Object.values(map);
  }, [containers]);

  if (networks.length === 0) {
    return <EmptyState icon={IconNetwork} title="No networks" description="Start a stack to see topology." />;
  }

  // Layout: center each network as hub, containers around
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Network topology</h1>
        <p className="text-sm text-muted-foreground">
          Which containers share which networks and volumes.
        </p>
      </div>

      <Card className="p-4">
        <svg viewBox="0 0 800 500" className="h-[500px] w-full">
          {networks.map((net, ni) => {
            const cx = 200 + (ni % 2) * 400;
            const cy = 120 + Math.floor(ni / 2) * 260;
            return (
              <g key={net.name}>
                <circle cx={cx} cy={cy} r={44} fill="var(--muted)" stroke="var(--border)" />
                <text x={cx} y={cy + 4} textAnchor="middle" className="fill-foreground" style={{ font: "600 12px JetBrains Mono" }}>
                  {net.name}
                </text>
                {net.containers.map((cn, i) => {
                  const angle = (i / net.containers.length) * Math.PI * 2 - Math.PI / 2;
                  const x = cx + Math.cos(angle) * 130;
                  const y = cy + Math.sin(angle) * 100;
                  return (
                    <g key={cn}>
                      <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1.5} />
                      <rect x={x - 50} y={y - 14} width={100} height={28} rx={4} fill="var(--card)" stroke="var(--border)" />
                      <text x={x} y={y + 4} textAnchor="middle" className="fill-foreground" style={{ font: "500 11px JetBrains Mono" }}>
                        {cn.length > 12 ? cn.slice(0, 12) + "…" : cn}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {networks.map((n) => (
          <Card key={n.name} className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <IconNetwork className="h-4 w-4 text-muted-foreground" stroke={1.75} />
              <span className="font-mono text-sm font-medium">{n.name}</span>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {n.containers.length} container{n.containers.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {n.containers.map((c) => (
                <Badge key={c} variant="outline" className="font-mono text-[10px]">
                  {c}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
