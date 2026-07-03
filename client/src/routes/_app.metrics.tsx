import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { generateMetricsHistory } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/metrics")({
  component: MetricsPage,
  head: () => ({ meta: [{ title: "Metrics · Stackhand" }] }),
});

type Range = "1h" | "24h" | "7d";
const RANGES: { id: Range; label: string; hours: number }[] = [
  { id: "1h", label: "1H", hours: 1 },
  { id: "24h", label: "24H", hours: 24 },
  { id: "7d", label: "7D", hours: 168 },
];

function MetricsPage() {
  const [range, setRange] = useState<Range>("24h");
  const hist = useMemo(() => generateMetricsHistory(168), []);
  const filtered = useMemo(() => {
    const h = RANGES.find((r) => r.id === range)!.hours;
    return hist.slice(-h - 1).map((p) => ({
      ...p,
      label:
        range === "1h"
          ? new Date(p.ts).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })
          : range === "24h"
            ? new Date(p.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date(p.ts).toLocaleDateString([], { month: "short", day: "numeric" }),
    }));
  }, [hist, range]);

  const avg = (k: "cpu" | "mem" | "net") =>
    Math.round(filtered.reduce((s, p) => s + p[k], 0) / Math.max(filtered.length, 1));
  const max = (k: "cpu" | "mem" | "net") =>
    Math.round(Math.max(...filtered.map((p) => p[k])));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
          <p className="text-sm text-muted-foreground">
            Historical resource usage across all running containers.
          </p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.id}
              size="sm"
              variant={range === r.id ? "default" : "outline"}
              onClick={() => setRange(r.id)}
              className="rounded-md font-mono text-xs"
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat title="CPU (avg)" value={`${avg("cpu")}%`} peak={`peak ${max("cpu")}%`} />
        <Stat title="Memory (avg)" value={`${avg("mem")}%`} peak={`peak ${max("mem")}%`} />
        <Stat title="Network (avg)" value={`${avg("net")} MB/s`} peak={`peak ${max("net")} MB/s`} />
      </div>

      <ChartCard title="CPU utilization" data={filtered} keyName="cpu" color="#6366f1" />
      <ChartCard title="Memory usage" data={filtered} keyName="mem" color="#10b981" />
      <ChartCard title="Network I/O" data={filtered} keyName="net" color="#f59e0b" />
    </div>
  );
}

function Stat({ title, value, peak }: { title: string; value: string; peak: string }) {
  return (
    <Card className="p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
      <div className="font-mono text-[11px] text-muted-foreground">{peak}</div>
    </Card>
  );
}

function ChartCard({
  title,
  data,
  keyName,
  color,
}: {
  title: string;
  data: any[];
  keyName: string;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-sm font-medium">{title}</div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`g-${keyName}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
            <YAxis tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
            <Tooltip
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontFamily: "JetBrains Mono",
                fontSize: 11,
              }}
            />
            <Area
              type="monotone"
              dataKey={keyName}
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#g-${keyName})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
