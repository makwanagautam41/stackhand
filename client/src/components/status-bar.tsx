import { Link } from "@tanstack/react-router";
import { IconActivity, IconCircleFilled, IconTerminal2 } from "@tabler/icons-react";
import { useWorkspaces } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { current, stacksByWs } = useWorkspaces();
  const stacks = current ? stacksByWs[current.id] ?? [] : [];
  const running = stacks.reduce(
    (n, s) => n + s.containers.filter((c) => c.status === "running").length,
    0,
  );
  const total = stacks.reduce((n, s) => n + s.containers.length, 0);
  const errored = stacks.reduce(
    (n, s) => n + s.containers.filter((c) => c.status === "error").length,
    0,
  );

  return (
    <div className="sticky bottom-0 z-20 flex h-7 items-center gap-3 border-t bg-muted/40 px-3 font-mono text-[11px] text-muted-foreground backdrop-blur">
      <div className="flex items-center gap-1.5">
        <IconTerminal2 className="h-3 w-3" stroke={2} />
        <span className="text-foreground/80">stackhand</span>
        <span className="opacity-40">v0.1.0</span>
      </div>
      <span className="opacity-30">|</span>
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: current?.color ?? "#888" }}
        />
        <span className="text-foreground/80">{current?.name ?? "—"}</span>
      </div>
      <span className="opacity-30">|</span>
      <div className="flex items-center gap-1.5">
        <IconCircleFilled
          className={cn(
            "h-2 w-2",
            current?.ollamaConnected ? "text-emerald-500" : "text-muted-foreground/50",
          )}
        />
        <span>ollama {current?.ollamaConnected ? "online" : "offline"}</span>
      </div>
      <span className="opacity-30">|</span>
      <Link to="/containers" className="flex items-center gap-1.5 hover:text-foreground">
        <IconActivity className="h-3 w-3" stroke={2} />
        <span>
          {running}/{total} running
        </span>
        {errored > 0 && <span className="text-destructive">· {errored} error</span>}
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden sm:inline">press ? for shortcuts</span>
        <span className="hidden sm:inline opacity-40">|</span>
        <span>ready</span>
      </div>
    </div>
  );
}
