import { useEffect, useState } from "react";
import { IconPlus, IconWorld, IconSearch } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { SearchStatus } from "@/lib/types";

interface ChatInputToolsProps {
  webSearchEnabled: boolean;
  onWebSearchToggle: (enabled: boolean) => void;
  searchEngine: string;
  onSearchEngineChange: (engine: string) => void;
}

export function ChatInputTools({
  webSearchEnabled,
  onWebSearchToggle,
  searchEngine,
  onSearchEngineChange,
}: ChatInputToolsProps) {
  const [status, setStatus] = useState<SearchStatus | null>(null);

  useEffect(() => {
    if (webSearchEnabled) {
      api.webSearchStatus().then(setStatus).catch(() => {});
    }
  }, [webSearchEnabled]);

  const engines = status?.engines ?? {};
  const configuredEngines = Object.entries(engines).filter(([_, e]) => e.configured);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground transition-colors"
        >
          <IconPlus className="h-4.5 w-4.5" stroke={1.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} className="w-64 p-2">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Tools</div>

          <label className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent transition-colors cursor-pointer">
            <IconWorld className="h-5 w-5 shrink-0 text-muted-foreground" stroke={1.5} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">Web Search</span>
            </div>
            <Switch checked={webSearchEnabled} onCheckedChange={onWebSearchToggle} />
          </label>

          {webSearchEnabled && (
            <>
              <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                <IconSearch className="h-5 w-5 shrink-0 text-muted-foreground" stroke={1.5} />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Select value={searchEngine} onValueChange={onSearchEngineChange}>
                    <SelectTrigger className="h-7 w-full min-w-0 border-0 bg-muted/50 px-2 text-xs shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(engines).map(([name, eng]) => (
                        <SelectItem key={name} value={name} className="text-xs capitalize" disabled={!eng.configured}>
                          <span className="flex items-center gap-2">
                            {name}
                            {!eng.configured && (
                              <span className="text-[10px] text-muted-foreground">(not configured)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-border/50 px-2 py-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Requests today</span>
                  <span className="font-mono tabular-nums">{status?.totalRequests ?? 0}</span>
                </div>
                {configuredEngines.length > 0 && (
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground/60">
                    <span>Active engine</span>
                    <span className="capitalize">{searchEngine}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
