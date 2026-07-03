import { IconBell, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspaces } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

const KIND_COLOR: Record<string, string> = {
  start: "text-emerald-500",
  stop: "text-amber-500",
  create: "text-sky-500",
  delete: "text-destructive",
  edit: "text-violet-500",
  error: "text-destructive",
  alert: "text-orange-500",
};

export function ActivityDrawer() {
  const { current, activityByWs } = useWorkspaces();
  const events = current ? activityByWs[current.id] ?? [] : [];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-md"
          aria-label="Activity"
        >
          <IconBell className="h-4 w-4" stroke={1.75} />
          {events.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-mono">Activity</SheetTitle>
          <SheetDescription>Recent events in this workspace</SheetDescription>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(100vh-8rem)] pr-2">
          {events.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <IconTrash className="mb-2 h-6 w-6 text-muted-foreground/40" stroke={1.5} />
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start gap-3 rounded-md border border-transparent px-2 py-2 hover:border-border hover:bg-accent/40"
                >
                  <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full bg-current", KIND_COLOR[e.kind])} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{e.message}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{e.ts}</div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">
                    {e.kind}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
