import { IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export function Loader({
  size = 16,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn("inline-flex items-center gap-2 text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <IconLoader2
        className="animate-spin"
        style={{ width: size, height: size }}
        stroke={1.75}
      />
      {label && <span className="font-mono text-xs">{label}</span>}
    </div>
  );
}

export function FullPageLoader({ label = "loading workspace…" }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] w-full place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-foreground/10" />
          <IconLoader2 className="h-5 w-5 animate-spin text-foreground/70" stroke={1.75} />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}
