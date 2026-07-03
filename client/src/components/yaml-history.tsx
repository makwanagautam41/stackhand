import { toast } from "sonner";
import { IconGitCommit, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type { YamlVersion } from "@/lib/types";

export function YamlHistory({
  versions,
  onRevert,
  onView,
}: {
  versions: YamlVersion[];
  onRevert: (v: YamlVersion) => void;
  onView?: (v: YamlVersion) => void;
}) {
  if (versions.length === 0) {
    return (
      <EmptyState
        icon={IconGitCommit}
        title="No history yet"
        description="Every save creates a local version you can diff and revert."
      />
    );
  }
  return (
    <Card className="divide-y">
      {versions.map((v, idx) => (
        <div key={v.id} className="flex items-center gap-3 p-3">
          <div className="grid h-8 w-8 place-items-center rounded-md border bg-muted/40 font-mono text-[10px]">
            #{versions.length - idx}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate font-mono text-sm">{v.message}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {new Date(v.ts).toLocaleString()}
            </div>
          </div>
          {onView && (
            <Button variant="ghost" size="sm" onClick={() => onView(v)} className="rounded-md">
              View
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onRevert(v);
              toast.success("Reverted to version");
            }}
            className="rounded-md"
          >
            <IconRefresh className="mr-1.5 h-3.5 w-3.5" stroke={1.75} /> Revert
          </Button>
        </div>
      ))}
    </Card>
  );
}
