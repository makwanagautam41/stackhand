import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IconDownload,
  IconPlayerPause,
  IconPlayerPlay,
  IconSearch,
  IconTerminal2,
} from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/empty-state";

import { MOCK_LOG_LINES } from "@/lib/mock-data";
import { useWorkspaces } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/logs")({
  component: LogsPage,
  head: () => ({ meta: [{ title: "Logs · Stackhand" }] }),
});

interface Line {
  ts: string;
  level: "INFO" | "WARN" | "ERROR";
  source: string;
  message: string;
}

function pickLevel(msg: string): Line["level"] {
  if (msg.includes("[ERROR]")) return "ERROR";
  if (msg.includes("[WARN]")) return "WARN";
  return "INFO";
}

function LogsPage() {
  const { current, stacksByWs } = useWorkspaces();
  const containers = current
    ? (stacksByWs[current.id] ?? []).flatMap((s) =>
        s.containers.map((c) => ({ ...c, stack: s.name })),
      )
    : [];

  const [selectedId, setSelectedId] = useState<string | null>(containers[0]?.id ?? null);
  const selected = containers.find((c) => c.id === selectedId) ?? null;

  const [levels, setLevels] = useState({ INFO: true, WARN: true, ERROR: true });
  const [q, setQ] = useState("");
  const [regex, setRegex] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset stream when the selected container changes so viewers only see
  // one container's output at a time.
  useEffect(() => {
    setLines([]);
  }, [selectedId]);

  useEffect(() => {
    if (paused || !selected) return;
    const t = setInterval(() => {
      const msg = MOCK_LOG_LINES[Math.floor(Math.random() * MOCK_LOG_LINES.length)];
      const line: Line = {
        ts: new Date().toISOString().slice(11, 19),
        level: pickLevel(msg),
        source: selected.name,
        message: msg.replace(/^\[(INFO|WARN|ERROR)\]\s*/, ""),
      };
      setLines((prev) => [...prev.slice(-499), line]);
    }, 550);
    return () => clearInterval(t);
  }, [paused, selected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const filtered = useMemo(() => {
    let rx: RegExp | null = null;
    if (regex && q) {
      try {
        rx = new RegExp(q, "i");
      } catch {
        rx = null;
      }
    }
    return lines.filter((l) => {
      if (!levels[l.level]) return false;
      if (!q) return true;
      if (rx) return rx.test(l.message);
      return l.message.toLowerCase().includes(q.toLowerCase());
    });
  }, [lines, levels, q, regex]);

  const download = () => {
    if (!selected) return;
    const text = filtered
      .map((l) => `[${l.ts}] ${l.level.padEnd(5)} ${l.source}  ${l.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.name}-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Log downloaded");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
          <p className="text-sm text-muted-foreground">
            {selected ? (
              <>
                Streaming <span className="font-mono">{selected.name}</span> ·{" "}
                {filtered.length} of {lines.length} lines
              </>
            ) : (
              "Select a container to view its logs"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-md"
            onClick={() => setPaused((v) => !v)}
            disabled={!selected}
          >
            {paused ? (
              <IconPlayerPlay className="mr-1.5 h-3.5 w-3.5" stroke={1.75} />
            ) : (
              <IconPlayerPause className="mr-1.5 h-3.5 w-3.5" stroke={1.75} />
            )}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-md"
            onClick={download}
            disabled={!selected || filtered.length === 0}
          >
            <IconDownload className="mr-1.5 h-3.5 w-3.5" stroke={1.75} /> Download
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="p-3 lg:col-span-1">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Containers
            </div>
            <Badge variant="secondary" className="h-4 px-1 font-mono text-[10px]">
              one at a time
            </Badge>
          </div>
          {containers.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">No containers</p>
          ) : (
            <ScrollArea className="max-h-[280px] pr-1">
              <div className="space-y-1">
                {containers.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md p-1.5 text-left transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          c.status === "running" && "bg-emerald-500",
                          c.status === "stopped" && "bg-muted-foreground/50",
                          c.status === "error" && "bg-destructive",
                        )}
                      />


                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-xs">{c.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {c.stack}
                        </div>
                      </div>
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <div className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Levels
          </div>
          <div className="space-y-1">
            {(["INFO", "WARN", "ERROR"] as const).map((lv) => (
              <label
                key={lv}
                className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-accent/40"
              >
                <Checkbox
                  checked={levels[lv]}
                  onCheckedChange={(v) =>
                    setLevels((prev) => ({ ...prev, [lv]: Boolean(v) }))
                  }
                />
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[10px]",
                    lv === "ERROR" && "border-destructive/40 text-destructive",
                    lv === "WARN" && "border-amber-500/40 text-amber-500",
                    lv === "INFO" && "border-foreground/20 text-foreground/70",
                  )}
                >
                  {lv}
                </Badge>
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Checkbox
              id="rx"
              checked={regex}
              onCheckedChange={(v) => setRegex(Boolean(v))}
            />
            <Label htmlFor="rx" className="font-mono text-[11px]">
              regex
            </Label>
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden lg:col-span-3">
          <div className="flex items-center justify-between gap-2 border-b p-2">
            <div className="relative flex-1">
              <IconSearch
                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                stroke={1.75}
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={regex ? "regex pattern…" : "search this container…"}
                className="rounded-md pl-9 font-mono text-xs"
                disabled={!selected}
              />
            </div>
            {selected && (
              <Badge variant="outline" className="font-mono text-[10px]">
                {selected.name}
              </Badge>
            )}
          </div>
          <div
            ref={scrollRef}
            className="scrollbar-thin h-[560px] overflow-auto bg-[oklch(0.145_0_0)] p-2 font-mono text-[12px] text-[oklch(0.9_0_0)]"
          >
            {!selected ? (
              <EmptyState
                icon={IconTerminal2}
                title="Pick a container"
                description="Select one container from the left to start streaming its logs."
                className="border-transparent bg-transparent"
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={IconTerminal2}
                title="Waiting for output…"
                description={paused ? "Stream paused." : "Log lines will appear here."}
                className="border-transparent bg-transparent"
              />
            ) : (
              filtered.map((l, i) => (
                <div key={i} className="flex gap-2 hover:bg-white/5">
                  <span className="text-white/40">{l.ts}</span>
                  <span
                    className={cn(
                      "w-12 shrink-0",
                      l.level === "ERROR" && "text-red-400",
                      l.level === "WARN" && "text-amber-400",
                      l.level === "INFO" && "text-white/70",
                    )}
                  >
                    {l.level}
                  </span>
                  <span className="flex-1">{highlight(l.message, q, regex)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function highlight(text: string, q: string, regex: boolean) {
  if (!q) return text;
  try {
    const rx = regex
      ? new RegExp(`(${q})`, "gi")
      : new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(rx);
    return parts.map((p, i) =>
      i % 2 === 1 ? (
        <mark key={i} className="bg-yellow-300/40 text-white">
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  } catch {
    return text;
  }
}

