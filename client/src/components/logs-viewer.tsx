import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function LogsViewer({
  name,
  containerId,
  stackId,
}: {
  name: string;
  containerId?: string;
  stackId?: string;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLogs = async () => {
      try {
        let logData = "";
        if (containerId) {
          const data = await api.containerLogs(containerId, 200);
          logData = data;
        } else if (stackId) {
          const data = await api.getStackLogs(stackId, 200);
          logData = data.stdout || data.stderr || "";
        }

        if (!cancelled) {
          const parsed = logData
            .split("\n")
            .filter(Boolean)
            .slice(-200);
          setLines(parsed);
          setLoading(false);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      }
    };

    fetchLogs();

    // Poll for new logs
    intervalRef.current = setInterval(fetchLogs, 3000);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [containerId, stackId]);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines]);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-[#0b0f19] text-[#e2e8f0]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-medium">Live</span>
        <span className="text-mono text-white/50">{name}</span>
      </div>
      <div
        ref={ref}
        className="h-[360px] overflow-y-auto p-3 font-mono text-xs leading-5 scrollbar-thin"
      >
        {loading && <div className="text-white/40">Loading logs…</div>}
        {error && <div className="text-red-400">Error: {error}</div>}
        {!loading && !error && lines.length === 0 && (
          <div className="text-white/40">No logs available</div>
        )}
        {lines.map((l, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap",
              l.includes("[ERROR]") && "text-red-400",
              l.includes("[WARN]") && "text-amber-300",
              l.includes("error") && "text-red-400",
              l.includes("Error") && "text-red-400",
            )}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
