import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  IconRobot,
  IconLoader2,
  IconSend,
  IconSparkles,
  IconTrash,
  IconUser,
  IconWand,
  IconCopy,
  IconArrowRight,
  IconCornerDownLeft,
  IconBolt,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaces } from "@/lib/workspace-store";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ai")({
  component: AIPage,
  head: () => ({
    meta: [
      { title: "AI Assistant · Stackhand" },
      { name: "description", content: "Chat with local models to generate and explain compose files." },
    ],
  }),
});

const SUGGESTIONS = [
  { label: "Postgres with persistent storage", icon: "🐘" },
  { label: "Redis stack with auth", icon: "🧠" },
  { label: "Explain this docker-compose", icon: "📖" },
  { label: "Find image for MinIO", icon: "🪣" },
];

const PRESETS = [
  { id: "optimize", label: "Optimize", prompt: "Optimize this docker-compose for production." },
  { id: "healthcheck", label: "Add healthcheck", prompt: "Add sensible healthchecks to every service." },
  { id: "swarm", label: "Convert to Swarm", prompt: "Convert this compose file to Docker Swarm format with deploy specs." },
  { id: "explain", label: "Explain", prompt: "Explain what this compose file does line by line." },
  { id: "secure", label: "Harden security", prompt: "Suggest security hardening changes for this stack." },
];

const FAKE_YAML = `version: "3.9"
services:
  postgres:
    image: postgres:16
    container_name: postgres-generated
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pg-data:/var/lib/postgresql/data
    restart: unless-stopped
volumes:
  pg-data:
`;

function fakeReply(prompt: string): { text: string; yaml?: string } {
  if (/optimi/i.test(prompt)) {
    return {
      text:
        "**Optimization suggestions**\n\n- Pin image tags to specific versions\n- Add `healthcheck` blocks per service\n- Define `deploy.resources.limits`\n- Use named volumes for data\n- Set `restart: unless-stopped`",
      yaml: FAKE_YAML,
    };
  }
  if (/healthcheck/i.test(prompt)) {
    return { text: "Added HTTP/TCP healthchecks with `30s` interval and `3` retries to each service.", yaml: FAKE_YAML };
  }
  if (/swarm/i.test(prompt)) {
    return { text: "Converted to Swarm — added `deploy.replicas`, `deploy.resources`, and `deploy.restart_policy` blocks.", yaml: FAKE_YAML };
  }
  if (/explain/i.test(prompt)) {
    return { text: "This compose defines services with their images, port mappings, and volume mounts. Each service runs in its own container on the default bridge network unless overridden." };
  }
  if (/postgres|database/i.test(prompt)) {
    return { text: "Here's a **Postgres** stack with a named volume for persistence, sensible defaults, and an `unless-stopped` restart policy.", yaml: FAKE_YAML };
  }
  return { text: "Here's a starter compose file for your request — feel free to save it as a new stack.", yaml: FAKE_YAML };
}

function AIPage() {
  const {
    current,
    chatByWs,
    chatByStack,
    appendChat,
    appendStackChat,
    clearChat,
    clearStackChat,
    stacksByWs,
  } = useWorkspaces();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [model, setModel] = useState<string>("");
  const [scope, setScope] = useState<string>("workspace");
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const enabledModels = useMemo(() => current?.models.filter((m) => m.enabled) ?? [], [current]);
  const stacks = current ? stacksByWs[current.id] ?? [] : [];

  useEffect(() => {
    if (!model && enabledModels[0]) setModel(enabledModels[0].id);
  }, [model, enabledModels]);

  const messages: ChatMessage[] = current
    ? scope === "workspace"
      ? chatByWs[current.id] ?? []
      : chatByStack[scope] ?? []
    : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  if (!current) return null;

  const append = (msg: ChatMessage) => {
    if (scope === "workspace") appendChat(current.id, msg);
    else appendStackChat(scope, msg);
  };

  const clear = () => {
    if (scope === "workspace") clearChat(current.id);
    else clearStackChat(scope);
    toast("Chat cleared");
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    const user: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      ts: new Date().toISOString(),
    };
    append(user);
    setPrompt("");
    setThinking(true);
    setTimeout(() => {
      const reply = fakeReply(text);
      append({
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply.text,
        yaml: reply.yaml,
        ts: new Date().toISOString(),
      });
      setThinking(false);
    }, 900);
  };

  const scopedStack = stacks.find((s) => s.id === scope);
  const activeModel = enabledModels.find((m) => m.id === model);

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Local models via Ollama · {current.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-[200px] rounded-md font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="workspace">Workspace chat</SelectItem>
              {stacks.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Stack · {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {enabledModels.length > 0 ? (
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[180px] rounded-md font-mono text-xs">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {enabledModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-xs text-muted-foreground">No models enabled</div>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="rounded-md" onClick={clear}>
              <IconTrash className="mr-1.5 h-3.5 w-3.5" stroke={1.75} /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Chat surface */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-md border bg-card">
        {/* Meta bar */}
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 items-center justify-center">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  current.ollamaConnected ? "bg-emerald-500" : "bg-muted-foreground",
                )}
              />
            </span>
            <span>{current.ollamaConnected ? "connected" : "offline"}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{activeModel?.name ?? "no model"}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>
              {scope === "workspace" ? "workspace chat" : `stack: ${scopedStack?.name}`}
            </span>
          </div>
          <div>{messages.length} msg</div>
        </div>

        {/* Transcript */}
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center p-8 text-center">
              <div className="max-w-md">
                <div className="relative mx-auto mb-4 grid h-14 w-14 place-items-center rounded-md border bg-muted/40">
                  <IconSparkles className="h-5 w-5 text-primary" stroke={1.75} />
                  <span className="absolute -bottom-1 -right-1 rounded-sm bg-background px-1 font-mono text-[9px] uppercase text-muted-foreground border">
                    ai
                  </span>
                </div>
                <div className="font-mono text-sm font-medium">Ask about anything Docker</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Generate stacks, explain compose files, find images.
                </div>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => send(s.label)}
                      className="group flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent"
                    >
                      <span className="text-base leading-none">{s.icon}</span>
                      <span className="flex-1 font-mono">{s.label}</span>
                      <IconArrowRight
                        className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                        stroke={1.75}
                      />
                    </button>
                  ))}
                </div>
                {scope !== "workspace" && (
                  <div className="mt-4">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      chat scoped to stack: {scopedStack?.name}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 p-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} m={m} onUseYaml={() => navigate({ to: "/yaml" })} />
              ))}
              {thinking && (
                <div className="flex items-start gap-3">
                  <div className="grid h-7 w-7 place-items-center rounded-md border bg-muted/40">
                    <IconRobot className="h-3.5 w-3.5" stroke={1.75} />
                  </div>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 font-mono text-xs text-muted-foreground">
                    <IconLoader2 className="h-3 w-3 animate-spin" />
                    <span className="animate-pulse">Thinking</span>
                    <span className="inline-flex gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:120ms]" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:240ms]" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t bg-muted/20 p-3">
          {/* Presets */}
          <div className="mb-2 flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => send(p.prompt)}
                disabled={thinking || enabledModels.length === 0}
                className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <IconWand className="h-3 w-3" stroke={1.75} /> {p.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(prompt);
            }}
            className="relative rounded-md border bg-background focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-colors"
          >
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                enabledModels.length === 0
                  ? "Enable a model in Settings to chat…"
                  : "Ask for a stack, image, or explanation…"
              }
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(prompt);
                }
              }}
              className="min-h-[72px] resize-none border-0 bg-transparent pr-14 font-mono text-sm shadow-none focus-visible:ring-0"
              disabled={enabledModels.length === 0}
            />
            <div className="flex items-center justify-between border-t px-2 py-1.5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <IconBolt className="h-3 w-3" stroke={1.75} />
                <span>{activeModel?.name ?? "select model"}</span>
                <span className="text-muted-foreground/40">·</span>
                <kbd className="rounded-sm border bg-muted/50 px-1 py-px text-[9px]">⇧⏎</kbd>
                <span>newline</span>
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-7 rounded-md px-2"
                disabled={!prompt.trim() || thinking || enabledModels.length === 0}
              >
                {thinking ? (
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <IconSend className="mr-1 h-3.5 w-3.5" stroke={1.75} />
                    <span className="font-mono text-[11px]">Send</span>
                    <IconCornerDownLeft className="ml-1 h-3 w-3 opacity-60" stroke={1.75} />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ m, onUseYaml }: { m: ChatMessage; onUseYaml: () => void }) {
  const isUser = m.role === "user";
  const time = new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-md border",
          isUser ? "bg-primary/10 border-primary/30" : "bg-muted/40",
        )}
      >
        {isUser ? (
          <IconUser className="h-3.5 w-3.5" stroke={1.75} />
        ) : (
          <IconRobot className="h-3.5 w-3.5 text-primary" stroke={1.75} />
        )}
      </div>
      <div className={cn("flex max-w-[85%] flex-col gap-1.5", isUser && "items-end")}>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{isUser ? "you" : "assistant"}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{time}</span>
        </div>
        {isUser ? (
          <div className="rounded-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
            {m.content}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-md text-sm text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_p]:my-0 [&_ul]:my-1 [&_ul]:pl-4 [&_strong]:font-semibold">
            <ReactMarkdown>{m.content}</ReactMarkdown>
          </div>
        )}
        {m.yaml && <YamlBlock yaml={m.yaml} onUse={onUseYaml} />}
      </div>
    </div>
  );
}

function YamlBlock({ yaml, onUse }: { yaml: string; onUse: () => void }) {
  const lines = yaml.split("\n");
  const copy = async () => {
    await navigator.clipboard.writeText(yaml);
    toast.success("YAML copied");
  };
  return (
    <div className="w-full overflow-hidden rounded-md border bg-[#0b0f19] text-left text-[#e2e8f0]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400/70" />
            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
            docker-compose.yml
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <IconCopy className="h-3 w-3" stroke={1.75} /> Copy
          </button>
          <button
            type="button"
            onClick={() => {
              toast.success("Opened in YAML Explorer (simulated)");
              onUse();
            }}
            className="flex items-center gap-1 rounded-md bg-primary/90 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary"
          >
            Use this <IconArrowRight className="h-3 w-3" stroke={1.75} />
          </button>
        </div>
      </div>
      <pre className="scrollbar-thin max-h-72 overflow-auto p-3 font-mono text-[12px] leading-6">
        {lines.map((l, i) => (
          <div key={i} className="flex">
            <span className="mr-3 w-6 shrink-0 select-none text-right text-white/25 tabular-nums">
              {i + 1}
            </span>
            <span className="whitespace-pre">{colorYaml(l)}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

function colorYaml(line: string) {
  if (/^\s*#/.test(line)) return <span className="text-white/40 italic">{line || " "}</span>;
  const m = line.match(/^(\s*)([-]\s+)?([A-Za-z0-9_.\-]+)(:)(\s*)(.*)$/);
  if (m) {
    const [, indent, dash, key, colon, gap, rest] = m;
    return (
      <>
        <span>{indent}</span>
        {dash && <span className="text-fuchsia-300">{dash}</span>}
        <span className="text-sky-300">{key}</span>
        <span className="text-white/50">{colon}</span>
        <span>{gap}</span>
        {colorYamlValue(rest)}
      </>
    );
  }
  const dash = line.match(/^(\s*)(-\s+)(.*)$/);
  if (dash) {
    return (
      <>
        <span>{dash[1]}</span>
        <span className="text-fuchsia-300">{dash[2]}</span>
        {colorYamlValue(dash[3])}
      </>
    );
  }
  return <span>{line || " "}</span>;
}

function colorYamlValue(v: string) {
  if (!v) return null;
  if (/^["'].*["']$/.test(v)) return <span className="text-emerald-300">{v}</span>;
  if (/^(true|false|null|~)$/.test(v)) return <span className="text-amber-300">{v}</span>;
  if (/^-?\d+(\.\d+)?$/.test(v)) return <span className="text-amber-300">{v}</span>;
  return <span className="text-white/90">{v}</span>;
}
