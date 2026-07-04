import { cn } from "@/lib/utils";
import type { StackStatus, ContainerStatus } from "@/lib/types";

export function StatusBadge({
  status,
  className,
}: {
  status: StackStatus | ContainerStatus;
  className?: string;
}) {
  const config: Record<string, { label: string; dot: string; bg: string }> = {
    running: {
      label: "Running",
      dot: "bg-emerald-500",
      bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    stopped: {
      label: "Stopped",
      dot: "bg-slate-400",
      bg: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20",
    },
    error: {
      label: "Error",
      dot: "bg-red-500",
      bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    },
    partial: {
      label: "Partial",
      dot: "bg-amber-500",
      bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    unknown: {
      label: "Unknown",
      dot: "bg-slate-400",
      bg: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20",
    },
  };
  const c = config[status] ?? config.unknown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        c.bg,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}
