import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getSocket } from "@/lib/socket";

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
  const [streaming, setStreaming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchInitialLogs = useCallback(async () => {
    try {
      if (containerId) {
        const data = await api.containerLogs(containerId, 200);
        if (data) {
          const parsed = data.split("\n").filter(Boolean).slice(-200);
          setLines(parsed);
        }
      } else if (stackId) {
        const data = await api.getStackLogs(stackId, 200);
        const logData = data.stdout || data.stderr || "";
        const parsed = logData.split("\n").filter(Boolean).slice(-200);
        setLines(parsed);
      }
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, [containerId, stackId]);

  useEffect(() => {
    fetchInitialLogs();
  }, [fetchInitialLogs]);

  // For stack logs, use socket.io streaming
  useEffect(() => {
    if (!stackId) return;
    const socket = getSocket();
    socketRef.current = socket;

    socket.emit("stack:logs", { stackId, tail: 200 });

    const onLog = (data: { stackId: string; line: string }) => {
      if (data.stackId === stackId) {
        setStreaming(true);
        setLines((prev) => {
          const next = [...prev, data.line];
          if (next.length > 500) next.splice(0, next.length - 500);
          return next;
        });
      }
    };

    const onEnd = () => {
      setStreaming(false);
    };

    socket.on("stack:logs", onLog);
    socket.on("stack:logs:end", onEnd);

    return () => {
      socket.emit("stack:logs:stop", { stackId });
      socket.off("stack:logs", onLog);
      socket.off("stack:logs:end", onEnd);
    };
  }, [stackId]);

  // For container logs, use socket.io streaming
  useEffect(() => {
    if (!containerId) return;
    const socket = getSocket();

    socket.emit("container:logs", { containerId, tail: 200 });

    const onLog = (data: { containerId: string; line: string }) => {
      if (data.containerId === containerId) {
        setStreaming(true);
        setLines((prev) => {
          const next = [...prev, data.line];
          if (next.length > 500) next.splice(0, next.length - 500);
          return next;
        });
      }
    };

    const onEnd = () => {
      setStreaming(false);
    };

    socket.on("container:logs", onLog);
    socket.on("container:logs:end", onEnd);

    return () => {
      socket.emit("container:logs:stop", { containerId });
      socket.off("container:logs", onLog);
      socket.off("container:logs:end", onEnd);
    };
  }, [containerId]);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines]);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-[#0b0f19] text-[#e2e8f0]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs">
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full ${streaming ? "animate-ping bg-emerald-400 opacity-75" : "bg-slate-500"}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${streaming ? "bg-emerald-500" : "bg-slate-500"}`} />
        </span>
        <span className="font-medium">{streaming ? "Live" : "Cached"}</span>
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
