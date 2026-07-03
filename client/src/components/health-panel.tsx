import { IconActivityHeartbeat, IconRefresh, IconAlertTriangle } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Container } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HealthPanel({ containers }: { containers: Container[] }) {
  return (
    <div className="space-y-3">
      {containers.map((c) => {
        const h = c.health;
        if (!h) return null;
        return (
          <Card key={c.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-sm font-medium">{c.name}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{c.image}</div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[10px] uppercase",
                  h.healthy ? "border-emerald-500/40 text-emerald-500" : "border-destructive/40 text-destructive",
                )}
              >
                {h.healthy ? "healthy" : "unhealthy"}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={IconActivityHeartbeat} label="Uptime" value={h.uptime} />
              <Stat icon={IconRefresh} label="Restarts" value={String(h.restartCount)} />
              <Stat
                icon={IconAlertTriangle}
                label="Last exit"
                value={String(h.lastExitCode)}
                highlight={h.lastExitCode !== 0}
              />
              <Stat icon={IconActivityHeartbeat} label="Last check" value={h.lastCheck} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string; stroke?: number }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" stroke={1.75} /> {label}
      </div>
      <div className={cn("mt-1 font-mono text-sm", highlight && "text-destructive")}>{value}</div>
    </div>
  );
}
