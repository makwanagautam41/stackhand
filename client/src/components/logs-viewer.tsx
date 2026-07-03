import { useEffect, useRef, useState } from "react";
import { MOCK_LOG_LINES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function LogsViewer({ name }: { name: string }) {
  const [lines, setLines] = useState<string[]>(() =>
    MOCK_LOG_LINES.slice(0, 8).map((l) => `${new Date().toISOString()} ${name} | ${l}`),
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setLines((prev) => {
        const next = MOCK_LOG_LINES[Math.floor(Math.random() * MOCK_LOG_LINES.length)];
        return [...prev, `${new Date().toISOString()} ${name} | ${next}`].slice(-200);
      });
    }, 1200);
    return () => clearInterval(t);
  }, [name]);

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
        className="h-[360px] overflow-y-auto p-3 text-mono scrollbar-thin"
      >
        {lines.map((l, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap",
              l.includes("[ERROR]") && "text-red-400",
              l.includes("[WARN]") && "text-amber-300",
            )}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
