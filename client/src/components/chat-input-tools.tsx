import { useCallback, useEffect, useState } from "react";
import {
  IconPlus,
  IconWorld,
  IconSearch,
  IconCode,
  IconFileText,
  IconTerminal2,
  IconBrain,
  IconArrowLeft,
  IconX,
  IconChevronRight,
  IconClock,
  IconHistory,
} from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { SearchStatus, SearchLog } from "@/lib/types";

interface ChatInputToolsProps {
  webSearchEnabled: boolean;
  onWebSearchToggle: (enabled: boolean) => void;
  searchEngine: string;
  onSearchEngineChange: (engine: string) => void;
  onFillQuery?: (query: string) => void;
}

type ToolView = "main" | "web-search" | "generate-code" | "summarize" | "run-command" | "explain";

interface ToolDef {
  id: ToolView;
  icon: typeof IconWorld;
  label: string;
  desc: string;
}

const TOOLS: ToolDef[] = [
  { id: "web-search", icon: IconWorld, label: "Web Search", desc: "Search the web for current information" },
  { id: "generate-code", icon: IconCode, label: "Generate Code", desc: "Generate code snippets and boilerplate" },
  { id: "summarize", icon: IconFileText, label: "Summarize", desc: "Condense lengthy content into key points" },
  { id: "run-command", icon: IconTerminal2, label: "Run Command", desc: "Execute terminal commands and scripts" },
  { id: "explain", icon: IconBrain, label: "Explain", desc: "Break down complex concepts and code" },
];

const PLACEHOLDER_TOOLS: Record<string, { icon: typeof IconCode; label: string; desc: string; features: { name: string; desc: string }[] }> = {
  "generate-code": {
    icon: IconCode, label: "Generate Code", desc: "Generate code snippets and boilerplate",
    features: [
      { name: "Generate function", desc: "Create a standalone function from a description" },
      { name: "Generate class", desc: "Build a complete class with methods and properties" },
      { name: "Generate component", desc: "Create a reusable UI component" },
      { name: "Generate API route", desc: "Set up an API endpoint with request handling" },
      { name: "Generate test", desc: "Write unit/integration tests for your code" },
    ],
  },
  summarize: {
    icon: IconFileText, label: "Summarize", desc: "Condense lengthy content into key points",
    features: [
      { name: "Summarize paragraph", desc: "Condense one or more paragraphs into 2-3 sentences" },
      { name: "Summarize document", desc: "Extract the core message from a full document" },
      { name: "Extract key points", desc: "List the most important takeaways from content" },
      { name: "Create TL;DR", desc: "Generate a one-line summary of any text" },
      { name: "Bullet points", desc: "Convert prose into scannable bullet points" },
    ],
  },
  "run-command": {
    icon: IconTerminal2, label: "Run Command", desc: "Execute terminal commands and scripts",
    features: [
      { name: "Run shell command", desc: "Execute a bash or zsh command" },
      { name: "Run docker command", desc: "Manage containers, images, and volumes" },
      { name: "Run git command", desc: "Stage, commit, push, pull, and more" },
      { name: "Run npm script", desc: "Run package.json scripts" },
      { name: "Run custom script", desc: "Execute a multi-line script in any language" },
    ],
  },
  explain: {
    icon: IconBrain, label: "Explain", desc: "Break down complex concepts and code",
    features: [
      { name: "Explain code", desc: "Walk through what a piece of code does line by line" },
      { name: "Explain concept", desc: "Simplify a technical or abstract concept" },
      { name: "Explain error", desc: "Decode an error message and suggest fixes" },
      { name: "Explain architecture", desc: "Describe how system components fit together" },
      { name: "Explain trade-offs", desc: "Compare approaches with pros and cons" },
    ],
  },
};

function EngineBadge({ engine }: { engine: string }) {
  const colors: Record<string, string> = { tavily: "bg-violet-500/10 text-violet-600", google: "bg-blue-500/10 text-blue-600", brave: "bg-orange-500/10 text-orange-600" };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[engine] ?? "bg-muted text-muted-foreground"}`}>{engine}</span>;
}

export function ChatInputTools({
  webSearchEnabled,
  onWebSearchToggle,
  searchEngine,
  onSearchEngineChange,
  onFillQuery,
}: ChatInputToolsProps) {
  const [view, setView] = useState<ToolView>("main");
  const [status, setStatus] = useState<SearchStatus | null>(null);
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [allLogs, setAllLogs] = useState<SearchLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    api.webSearchStatus().then(setStatus).catch(() => {});
  }, []);

  const fetchLogs = useCallback((engine?: string, limit = 5) => {
    api.webSearchLogs(engine, limit).then(setLogs).catch(() => {});
  }, []);

  const fetchAllLogs = useCallback(() => {
    api.webSearchLogs(undefined, 50).then(setAllLogs).catch(() => {});
  }, []);

  useEffect(() => {
    if (view === "web-search") fetchLogs(searchEngine);
  }, [view, searchEngine, fetchLogs]);

  const deleteLog = useCallback(async (id: string) => {
    await api.webSearchDeleteLog(id);
    fetchLogs(searchEngine);
    fetchAllLogs();
  }, [searchEngine, fetchLogs, fetchAllLogs]);

  const engines = status?.engines ?? {};
  const configuredEngines = Object.entries(engines).filter(([_, e]) => e.configured);

  const iconClass = "h-5 w-5 shrink-0 text-muted-foreground";

  return (
    <>
      <Popover onOpenChange={(open) => { if (!open) setView("main"); }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground transition-colors"
          >
            <IconPlus className="h-4.5 w-4.5" stroke={1.5} />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" sideOffset={8} className="w-72 p-2">
          {view === "main" && (
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Tools</div>
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setView(tool.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent transition-colors"
                >
                  <tool.icon className={iconClass} stroke={1.5} />
                  <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                    <span className="text-sm font-medium">{tool.label}</span>
                    <span className="text-[11px] text-muted-foreground">{tool.desc}</span>
                  </div>
                  {tool.id === "web-search" ? (
                    <Switch checked={webSearchEnabled} onCheckedChange={onWebSearchToggle} onClick={(e) => e.stopPropagation()} />
                  ) : (
                    <IconChevronRight className="h-4 w-4 text-muted-foreground/60" stroke={1.5} />
                  )}
                </button>
              ))}
            </div>
          )}

          {view === "web-search" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <button type="button" onClick={() => setView("main")} className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors">
                  <IconArrowLeft className="h-4 w-4" stroke={1.5} />
                </button>
                <span className="text-sm font-medium">Web Search</span>
              </div>

              <div className="flex items-center gap-3 px-2 py-1">
                <IconSearch className={iconClass} stroke={1.5} />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Select value={searchEngine} onValueChange={onSearchEngineChange}>
                    <SelectTrigger className="h-7 w-full min-w-0 border bg-muted/50 px-2 text-xs shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(engines).map(([name, eng]) => (
                        <SelectItem key={name} value={name} className="text-xs capitalize" disabled={!eng.configured}>
                          <span className="flex items-center gap-2">
                            {name}
                            {!eng.configured && <span className="text-[10px] text-muted-foreground">(not configured)</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Switch checked={webSearchEnabled} onCheckedChange={onWebSearchToggle} />
              </div>

              <div className="border-t border-border/50 px-2 py-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <IconHistory className="h-3.5 w-3.5" stroke={1.5} />
                    <span>Total requests</span>
                  </div>
                  <span className="font-mono tabular-nums">{status?.totalRequests ?? 0}</span>
                </div>
                {configuredEngines.length > 0 && (
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground/60">
                    <span>Active engine</span>
                    <span className="capitalize font-medium">{searchEngine}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-border/50 px-2 py-1.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <IconClock className="h-3.5 w-3.5 text-muted-foreground" stroke={1.5} />
                    <span className="text-[11px] font-medium text-muted-foreground">Recent Searches</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { fetchAllLogs(); setShowHistory(true); }}
                    className="text-[11px] text-primary font-medium hover:underline"
                  >
                    View all
                  </button>
                </div>
                {logs.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60 text-center py-2">No searches yet</p>
                ) : (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        onClick={() => onFillQuery?.(log.query)}
                        className="group flex items-center justify-between text-[11px] rounded px-1.5 py-1 hover:bg-accent/50 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <EngineBadge engine={log.engine} />
                          <span className="truncate">{log.query}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-muted-foreground/60">{log.results} results</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }}
                            className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-opacity"
                          >
                            <IconX className="h-3 w-3" stroke={1.5} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {["generate-code", "summarize", "run-command", "explain"].includes(view) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <button type="button" onClick={() => setView("main")} className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors">
                  <IconArrowLeft className="h-4 w-4" stroke={1.5} />
                </button>
                <span className="text-sm font-medium capitalize">{view.replace("-", " ")}</span>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">Coming soon</span>
              </div>
              <p className="text-[11px] text-muted-foreground/70 px-2">{PLACEHOLDER_TOOLS[view]?.desc}</p>
              <div className="space-y-0.5 px-1">
                {(PLACEHOLDER_TOOLS[view]?.features ?? []).map((feature) => (
                  <div key={feature.name} className="flex items-center gap-3 rounded-lg px-2 py-2 opacity-60">
                    <div className="h-6 w-6 rounded-md bg-muted/50 flex items-center justify-center">
                      <IconChevronRight className="h-3.5 w-3.5 text-muted-foreground" stroke={1.5} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                      <span className="text-xs font-medium">{feature.name}</span>
                      <span className="text-[10px] text-muted-foreground">{feature.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Search History</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
            {allLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No searches yet</p>
            ) : (
              <div className="space-y-2">
                {allLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => { onFillQuery?.(log.query); setShowHistory(false); }}
                    className="group flex items-start gap-3 rounded-lg border border-border/50 p-3 hover:bg-accent/30 cursor-pointer transition-colors"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <EngineBadge engine={log.engine} />
                        <span className="text-xs text-muted-foreground/60">
                          {new Date(log.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <span className="text-sm font-medium truncate">{log.query}</span>
                      <span className="text-[11px] text-muted-foreground/60">{log.results} results returned</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }}
                      className="opacity-0 group-hover:opacity-100 mt-0.5 h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    >
                      <IconX className="h-3.5 w-3.5" stroke={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
