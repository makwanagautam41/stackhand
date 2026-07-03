import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string; stroke?: number }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-md border border-dashed bg-muted/20 px-6 py-16 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="relative">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-md border bg-background shadow-sm">
          <Icon className="h-6 w-6 text-muted-foreground" stroke={1.5} />
        </div>
        <h3 className="mt-4 font-mono text-sm font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
