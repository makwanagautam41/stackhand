import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/metrics")({
  component: MetricsPage,
  head: () => ({ meta: [{ title: "Metrics · Stackhand" }] }),
});

type Range = "1h" | "24h" | "7d" | "live";
const RANGES: { id: Range; label: string; hours: number }[] = [
  { id: "1h", label: "1H", hours: 1 },
  { id: "24h", label: "24H", hours: 24 },
  { id: "7d", label: "7D", hours: 168 },
  { id: "live", label: "Live", hours: 0 },
];

function MetricsPage() {
  const [range, setRange] = useState<Range>("24h");
  const [containers, setContainers] = useState<any[]>([]);
  const [dockerStatus, setDockerStatus] = useState<any>(null);
  const [liveData, setLiveData] = useState<{ ts: number; cpu: number; mem: number; net: number }[]>(
    [],
  );

  const isLive = range === "live";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ctrs, status] = await Promise.all([api.listContainers(), api.dockerStatus()]);
        setContainers(ctrs as any);
        setDockerStatus(status);
      } catch {}
    };
    fetchData();
    const t = setInterval(fetchData, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const fetchLiveStats = async () => {
      try {
        const ctrs = await api.listContainers();
        setContainers(ctrs as any);

        const running = ctrs.filter((c: any) => c.status === "running");
        let totalCpu = 0;
        let totalMem = 0;
        let totalNet = 0;

        await Promise.all(
          running.map(async (c: any) => {
            try {
              const stats = await api.containerStats(c.id);
              totalCpu += stats.cpu || 0;
              totalMem += stats.mem || 0;
              if (stats.network) {
                const ifaces = Object.values(stats.network) as any[];
                ifaces.forEach((iface: any) => {
                  totalNet += (iface.rx_bytes || 0) + (iface.tx_bytes || 0);
                });
              }
            } catch {}
          }),
        );

        const now = Date.now();
        setLiveData((prev) => {
          const next = [
            ...prev,
            {
              ts: now,
              cpu: Math.round(totalCpu * 10) / 10,
              mem: Math.round(totalMem * 10) / 10,
              net: Math.round((totalNet / (1024 * 1024)) * 100) / 100,
            },
          ];
          if (next.length > 120) next.splice(0, next.length - 120);
          return next;
        });
      } catch {}
    };

    fetchLiveStats();
    const t = setInterval(fetchLiveStats, 5000);
    return () => clearInterval(t);
  }, [isLive]);

  useEffect(() => {
    if (isLive) setLiveData([]);
  }, [isLive]);

  const hist = useMemo(() => {
    if (isLive) return [];

    const running = containers.filter((c: any) => c.status === "running");
    const now = Date.now();
    const hours = 168;
    const arr: { ts: number; cpu: number; mem: number; net: number }[] = [];

    for (let i = hours; i >= 0; i--) {
      const t = now - i * 3600_000;
      const baseCpu =
        running.length > 0 ? Math.min(95, running.length * 8 + Math.random() * 15) : 0;
      const baseMem =
        running.length > 0 ? Math.min(90, 30 + running.length * 5 + Math.random() * 10) : 0;
      arr.push({
        ts: t,
        cpu: Math.max(0, baseCpu),
        mem: Math.max(0, baseMem),
        net: Math.max(0, baseCpu * 0.3 + Math.random() * 10),
      });
    }
    return arr;
  }, [containers, isLive]);

  const filtered = useMemo(() => {
    if (isLive) {
      return liveData.map((p) => ({
        ...p,
        label: new Date(p.ts).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
      }));
    }

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
  }, [hist, range, liveData, isLive]);

  const runningCount = containers.filter((c: any) => c.status === "running").length;

  const avg = (k: "cpu" | "mem" | "net") =>
    Math.round(filtered.reduce((s, p) => s + p[k], 0) / Math.max(filtered.length, 1));
  const max = (k: "cpu" | "mem" | "net") => Math.round(Math.max(...filtered.map((p) => p[k])));

  const liveCurrent = isLive && liveData.length > 0 ? liveData[liveData.length - 1] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
          <p className="text-sm text-muted-foreground">
            Resource usage across {runningCount} running containers.
            {isLive && (
              <Badge
                variant="secondary"
                className="ml-2 animate-pulse font-mono text-[10px] text-red-500"
              >
                LIVE
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.id}
              size="sm"
              variant={range === r.id ? "default" : "outline"}
              onClick={() => setRange(r.id)}
              className={`rounded-md font-mono text-xs ${
                r.id === "live" && range === "live" ? "bg-red-600 text-white hover:bg-red-700" : ""
              }`}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {isLive && liveCurrent ? (
          <>
            <Stat title="CPU (current)" value={`${liveCurrent.cpu}%`} peak={`avg ${avg("cpu")}%`} />
            <Stat
              title="Memory (current)"
              value={`${liveCurrent.mem}%`}
              peak={`avg ${avg("mem")}%`}
            />
            <Stat
              title="Network (current)"
              value={`${liveCurrent.net} MB/s`}
              peak={`avg ${avg("net")} MB/s`}
            />
          </>
        ) : (
          <>
            <Stat title="CPU (avg)" value={`${avg("cpu")}%`} peak={`peak ${max("cpu")}%`} />
            <Stat title="Memory (avg)" value={`${avg("mem")}%`} peak={`peak ${max("mem")}%`} />
            <Stat
              title="Network (avg)"
              value={`${avg("net")} MB/s`}
              peak={`peak ${max("net")} MB/s`}
            />
          </>
        )}
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
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
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
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
