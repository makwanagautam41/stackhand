import { IconPlus, IconWorld } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

interface ChatInputToolsProps {
  webSearchEnabled: boolean;
  onWebSearchToggle: (enabled: boolean) => void;
}

export function ChatInputTools({ webSearchEnabled, onWebSearchToggle }: ChatInputToolsProps) {
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
