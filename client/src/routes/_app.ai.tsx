import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  IconRobot,
  IconLoader2,
  IconSend,
  IconTrash,
  IconCopy,
  IconPlus,
  IconHistory,
  IconSettings,
  IconX,
  IconSquareX,
  IconLayoutSidebar,
  IconFileText,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspaces } from "@/lib/workspace-store";
import type {
  ChatMessage,
  OllamaModel,
  OllamaModelInfo,
  OllamaMetrics,
  OllamaChatOptions,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/ai")({
  component: AIPage,
  head: () => ({
    meta: [
      { title: "AI Studio · Stackhand" },
      {
        name: "description",
        content:
          "Chat with local LLMs via Ollama. Generate stacks, run custom prompts, and monitor generation stats.",
      },
    ],
  }),
});

interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: string;
}

interface PastedAttachment {
  id: string;
  content: string;
}

const STORAGE_KEY = "stackhand-ai-studio";

// Anything bigger than this gets pulled out of the textarea and turned into
// a "pasted content" chip instead of being dumped inline (same idea as
// Claude's UI does for large pastes).
const PASTE_CHAR_THRESHOLD = 400;
const PASTE_LINE_THRESHOLD = 10;

function AIPage() {
  const { current } = useWorkspaces();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [model, setModel] = useState<string>("");
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [modelInfo, setModelInfo] = useState<OllamaModelInfo | null>(null);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaVersion, setOllamaVersion] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const promptRef = useRef(prompt);

  // ---- Pasted-content attachments ----
  const [attachments, setAttachments] = useState<PastedAttachment[]>([]);
  const attachmentsRef = useRef(attachments);
  const [viewingAttachmentId, setViewingAttachmentId] = useState<string | null>(null);
  const [attachmentDraft, setAttachmentDraft] = useState("");

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const viewingAttachment = attachments.find((a) => a.id === viewingAttachmentId) ?? null;

  const openAttachment = useCallback((a: PastedAttachment) => {
    setViewingAttachmentId(a.id);
    setAttachmentDraft(a.content);
  }, []);

  const closeAttachmentDialog = useCallback(() => {
    setViewingAttachmentId(null);
    setAttachmentDraft("");
  }, []);

  const saveAttachmentDraft = useCallback(() => {
    if (!viewingAttachmentId) return;
    setAttachments((prev) =>
      prev.map((a) => (a.id === viewingAttachmentId ? { ...a, content: attachmentDraft } : a)),
    );
    closeAttachmentDialog();
  }, [viewingAttachmentId, attachmentDraft, closeAttachmentDialog]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleTextareaPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData?.getData("text");
    if (!text) return;
    const lineCount = text.split("\n").length;
    if (text.length > PASTE_CHAR_THRESHOLD || lineCount > PASTE_LINE_THRESHOLD) {
      e.preventDefault();
      setAttachments((prev) => [...prev, { id: crypto.randomUUID(), content: text }]);
    }
  }, []);

  // Combine attachments + typed prompt into the final message text sent to the model.
  const buildOutgoingText = useCallback((text: string, atts: PastedAttachment[]) => {
    if (atts.length === 0) return text;
    const blocks = atts
      .map(
        (a, i) =>
          `<pasted_content index="${i + 1}" length="${a.content.length} chars">\n${a.content}\n</pasted_content>`,
      )
      .join("\n\n");
    return text.trim() ? `${blocks}\n\n${text}` : blocks;
  }, []);

  const restore = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        const currentId = sessions.some((s: ChatSession) => s.id === data.currentId)
          ? data.currentId
          : (sessions[0]?.id ?? null);
        return { sessions, currentId };
      }
    } catch {}
    return { sessions: [], currentId: null };
  }, []);

  const [sessions, setSessions] = useState<ChatSession[]>(() => restore().sessions);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    () => restore().currentId,
  );
  const currentSessionIdRef = useRef(currentSessionId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [genOptions, setGenOptions] = useState<OllamaChatOptions>({
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    maxTokens: 4096,
  });
  const [seed, setSeed] = useState<string>("");
  const [streamContent, setStreamContent] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [metrics, setMetrics] = useState<OllamaMetrics | null>(null);
  const [liveStats, setLiveStats] = useState<{ startTime: number; tokensReceived: number } | null>(
    null,
  );

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const messages = currentSession?.messages ?? [];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, currentId: currentSessionId }));
  }, [sessions, currentSessionId]);

  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    if (!model && models.length > 0) setModel(models[0].name);
  }, [model, models]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledUpRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, streamContent, thinking]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 100;
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const status = await api.ollamaStatus();
      setOllamaConnected(status.connected);
      if (status.connected) {
        const [modelList, ver] = await Promise.all([api.ollamaModels(), api.ollamaVersion()]);
        setModels(
          modelList.map((m) => ({
            id: m.id,
            name: m.name,
            size: formatSize(m.size),
            enabled: true,
          })),
        );
        setOllamaVersion(ver.version ?? "");
        if (!model && modelList.length > 0) setModel(modelList[0].name);
      }
    } catch {
      setOllamaConnected(false);
    }
  }, [model]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (model && ollamaConnected) {
      api
        .ollamaModelInfo(model)
        .then(setModelInfo)
        .catch(() => setModelInfo(null));
    } else setModelInfo(null);
  }, [model, ollamaConnected]);

  const createSession = useCallback(() => {
    const id = crypto.randomUUID();
    const session: ChatSession = {
      id,
      name: "New chat",
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setSessions((prev) => [...prev, session]);
    setCurrentSessionId(id);
    return id;
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (currentSessionIdRef.current === id) setCurrentSessionId(next[0]?.id ?? null);
      return next;
    });
  }, []);

  useEffect(() => {
    if (sessions.length === 0) createSession();
  }, [sessions.length, createSession]);

  const clearMessages = () => {
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? { ...s, messages: [] } : s)),
    );
    setMetrics(null);
    setStreamContent("");
    toast("Chat cleared");
  };

  const formatDuration = (ns: number) => {
    const ms = ns / 1_000_000;
    return ms < 1000 ? `${ms.toFixed(0)} ms` : `${(ms / 1000).toFixed(2)} sec`;
  };

  const updateSessionName = useCallback((sessionId: string, content: string) => {
    const name = content.trim().slice(0, 40).split("\n")[0];
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, name: name + (content.trim().length > 40 ? "…" : "") } : s,
      ),
    );
  }, []);

  const stopStreaming = useCallback(() => {
    const sessionId = currentSessionIdRef.current;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setThinking(false);
    setStreaming(false);
    if (streamContent && sessionId) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: streamContent + "\n\n*[stopped]*",
                    ts: new Date().toISOString(),
                  },
                ],
              }
            : s,
        ),
      );
    }
    setStreamContent("");
    setLiveStats(null);
  }, [streamContent]);

  const sendStream = async (text: string) => {
    if (sendingRef.current || !text.trim() || !model) return;
    sendingRef.current = true;

    try {
      let sessionId = currentSessionIdRef.current;
      if (!sessionId) {
        const id = crypto.randomUUID();
        const session: ChatSession = {
          id,
          name: "New chat",
          messages: [],
          createdAt: new Date().toISOString(),
        };
        setSessions((prev) => [...prev, session]);
        setCurrentSessionId(id);
        currentSessionIdRef.current = id;
        sessionId = id;
      }

      const existing = sessions.find((s) => s.id === sessionId);
      const sessionMessages = existing?.messages ?? [];
      const isFirst = sessionMessages.length === 0;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        ts: new Date().toISOString(),
      };
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, messages: [...s.messages, userMsg] } : s)),
      );
      if (isFirst) updateSessionName(sessionId, text);
      setPrompt("");
      setThinking(true);
      setStreaming(true);
      setStreamContent("");
      setMetrics(null);
      setLiveStats({ startTime: Date.now(), tokensReceived: 0 });

      let fullContent = "";
      let lastMetrics: OllamaMetrics | null = null;
      const controller = new AbortController();
      abortRef.current = controller;

      const allMessages = [...sessionMessages, userMsg];
      const response = await fetch(api.ollamaChatStreamUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("stackhand-api-token") || "dev-token"}`,
        },
        body: JSON.stringify({
          model,
          messages: allMessages,
          options: { ...genOptions, seed: seed ? parseInt(seed, 10) : undefined },
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          if (data.startsWith("{")) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.message?.content) {
                fullContent += parsed.message.content;
                setStreamContent(fullContent);
                setLiveStats((prev) =>
                  prev ? { ...prev, tokensReceived: prev.tokensReceived + 1 } : prev,
                );
              }
              if (parsed.done) {
                lastMetrics = {
                  promptEvalCount: parsed.prompt_eval_count ?? 0,
                  evalCount: parsed.eval_count ?? 0,
                  totalDuration: parsed.total_duration ?? 0,
                  loadDuration: parsed.load_duration ?? 0,
                  promptEvalDuration: parsed.prompt_eval_duration ?? 0,
                  evalDuration: parsed.eval_duration ?? 0,
                };
              }
            } catch {}
          }
        }
      }

      if (fullContent) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [
                    ...s.messages,
                    {
                      id: crypto.randomUUID(),
                      role: "assistant",
                      content: fullContent,
                      ts: new Date().toISOString(),
                    },
                  ],
                }
              : s,
          ),
        );
      }
      if (lastMetrics) setMetrics(lastMetrics);
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error(e.message ?? "Chat failed");
    } finally {
      sendingRef.current = false;
      abortRef.current = null;
      setThinking(false);
      setStreaming(false);
      setStreamContent("");
      setLiveStats(null);
    }
  };

  // Fires the actual send: stitches attachments + prompt together, then clears both.
  const submitMessage = () => {
    const text = promptRef.current;
    const atts = attachmentsRef.current;
    if (!text.trim() && atts.length === 0) return;
    const combined = buildOutgoingText(text, atts);
    setAttachments([]);
    sendStream(combined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.code === "Enter") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      submitMessage();
    }
  };

  if (!current) return null;

  const elapsed = liveStats ? ((Date.now() - liveStats.startTime) / 1000).toFixed(1) : "0";
  const activeModel = models.find((m) => m.name === model);
  const canSend = (prompt.trim().length > 0 || attachments.length > 0) && !thinking && !!model;

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden" style={{ maxHeight: "calc(100vh - 8rem)" }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="flex w-56 shrink-0 flex-col overflow-hidden rounded-lg border bg-card">
          <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
            <span className="font-mono text-xs font-medium text-foreground">Chats</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <IconLayoutSidebar className="h-4 w-4" stroke={1.5} />
            </button>
          </div>
          <div className="shrink-0 p-2">
            <button
              onClick={createSession}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
            >
              <IconPlus className="h-4 w-4" stroke={1.5} />
              New chat
            </button>
          </div>
          {/* Scrollable history list only — header and "New chat" stay put */}
          <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
            <div className="space-y-0.5">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
                    s.id === currentSessionId
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  onClick={() => setCurrentSessionId(s.id)}
                >
                  <IconHistory className="h-4 w-4 shrink-0" stroke={1.5} />
                  <span className="flex-1 truncate">{s.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                      if (sessions.length <= 1) createSession();
                    }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <IconX className="h-3.5 w-3.5" stroke={1.5} />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
        {/* Header (static) */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <IconLayoutSidebar className="h-4 w-4" stroke={1.5} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  ollamaConnected ? "bg-emerald-500" : "bg-muted-foreground/50",
                )}
              />
              <span className="text-sm font-medium">
                {activeModel?.name ?? (ollamaConnected ? "Select a model" : "Ollama offline")}
              </span>
            </div>
            {ollamaVersion && (
              <span className="text-xs text-muted-foreground/50">v{ollamaVersion}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {streaming && (
              <Button
                variant="destructive"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={stopStreaming}
              >
                <IconSquareX className="h-3.5 w-3.5" stroke={1.5} />
                Stop
              </Button>
            )}
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-7 w-auto min-w-[100px] rounded-md border px-2 text-xs font-mono shadow-none">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.name} className="font-mono text-xs">
                    {m.name}
                  </SelectItem>
                ))}
                {models.length === 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    {ollamaConnected ? "No models" : "Ollama offline"}
                  </div>
                )}
              </SelectContent>
            </Select>
            <Dialog open={showControls} onOpenChange={setShowControls}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <IconSettings className="h-4 w-4" stroke={1.5} />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">Generation parameters</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Temperature</span>
                      <span className="font-mono tabular-nums">
                        {genOptions.temperature?.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[genOptions.temperature ?? 0.7]}
                      min={0}
                      max={2}
                      step={0.05}
                      onValueChange={([v]) => setGenOptions((o) => ({ ...o, temperature: v }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Top P</span>
                      <span className="font-mono tabular-nums">{genOptions.topP?.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[genOptions.topP ?? 0.9]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={([v]) => setGenOptions((o) => ({ ...o, topP: v }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Top K</span>
                      <span className="font-mono tabular-nums">{genOptions.topK}</span>
                    </div>
                    <Slider
                      value={[genOptions.topK ?? 40]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => setGenOptions((o) => ({ ...o, topK: v }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Repeat penalty</span>
                      <span className="font-mono tabular-nums">
                        {genOptions.repeatPenalty?.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[genOptions.repeatPenalty ?? 1.1]}
                      min={0}
                      max={2}
                      step={0.05}
                      onValueChange={([v]) => setGenOptions((o) => ({ ...o, repeatPenalty: v }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Max tokens</span>
                      <span className="font-mono tabular-nums">{genOptions.maxTokens}</span>
                    </div>
                    <Slider
                      value={[genOptions.maxTokens ?? 4096]}
                      min={64}
                      max={32768}
                      step={64}
                      onValueChange={([v]) => setGenOptions((o) => ({ ...o, maxTokens: v }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Seed</Label>
                    <Input
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="Auto"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {messages.length > 0 && !streaming && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={clearMessages}
              >
                <IconTrash className="h-3.5 w-3.5" stroke={1.5} />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Chat area — the ONLY thing that scrolls in the right column */}
        <ScrollArea ref={scrollRef} className="min-h-0 flex-1" onScroll={handleScroll}>
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.length === 0 && !streaming ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl border bg-muted/30">
                  <IconRobot className="h-6 w-6 text-primary" stroke={1.5} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask about Docker, compose files, or anything else.
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <kbd className="rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">
                    Ctrl
                  </kbd>
                  <span>+</span>
                  <kbd className="rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">
                    Enter
                  </kbd>
                  <span>to send</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <MessageBubble key={m.id} m={m} />
                ))}
                {thinking && !streamContent && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                )}
                {streaming && streamContent && (
                  <MessageBubble
                    m={{
                      id: "stream",
                      role: "assistant",
                      content: streamContent,
                      ts: new Date().toISOString(),
                    }}
                    isStreaming
                  />
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Stats bar (static) */}
        {(streaming || metrics) && (
          <div className="shrink-0 border-t bg-muted/20 px-4 py-1.5">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {streaming && liveStats && (
                <>
                  <span className="tabular-nums">{elapsed}s</span>
                  <span className="tabular-nums">{liveStats.tokensReceived} tok</span>
                  {parseFloat(elapsed) > 0 && (
                    <span className="tabular-nums">
                      {(liveStats.tokensReceived / parseFloat(elapsed)).toFixed(0)} tok/s
                    </span>
                  )}
                  <span className="ml-auto text-primary/60 animate-pulse">Generating...</span>
                </>
              )}
              {metrics && (
                <>
                  <span>Prompt: {metrics.promptEvalCount} tok</span>
                  <span>Generated: {metrics.evalCount} tok</span>
                  <span>Total: {metrics.promptEvalCount + metrics.evalCount} tok</span>
                  <span className="text-muted-foreground/30">|</span>
                  {metrics.evalDuration > 0 && (
                    <span>
                      {(metrics.evalCount / (metrics.evalDuration / 1_000_000_000)).toFixed(0)}{" "}
                      tok/s
                    </span>
                  )}
                  <span>{formatDuration(metrics.totalDuration)}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Composer (static) */}
        <div className="shrink-0 border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitMessage();
            }}
            className="relative rounded-xl border bg-background shadow-sm transition-shadow focus-within:shadow-md focus-within:border-primary/40"
          >
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-3 pt-3">
                {attachments.map((a, idx) => (
                  <PastedContentChip
                    key={a.id}
                    index={idx + 1}
                    attachment={a}
                    onOpen={() => openAttachment(a)}
                    onRemove={() => removeAttachment(a.id)}
                  />
                ))}
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handleTextareaPaste}
              placeholder={!model ? "Select a model to start chatting…" : "Message AI Studio..."}
              rows={1}
              className="min-h-[52px] resize-none border-0 bg-transparent px-4 py-3.5 pr-20 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
              disabled={!model}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              {(prompt.trim() || attachments.length > 0) && !thinking && (
                <span className="text-[10px] text-muted-foreground/40 hidden sm:block">
                  Ctrl+Enter
                </span>
              )}
              <Button
                type="submit"
                size="sm"
                className="h-8 w-8 rounded-lg p-0"
                disabled={!canSend}
              >
                {thinking ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <IconSend className="h-4 w-4" stroke={1.5} />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* View / edit pasted content popup */}
      <Dialog open={!!viewingAttachment} onOpenChange={(open) => !open && closeAttachmentDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Pasted content</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={attachmentDraft}
              onChange={(e) => setAttachmentDraft(e.target.value)}
              rows={16}
              className="resize-none font-mono text-xs"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {attachmentDraft.length.toLocaleString()} characters ·{" "}
                {attachmentDraft.split("\n").length.toLocaleString()} lines
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={closeAttachmentDialog}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveAttachmentDraft}>
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PastedContentChip({
  index,
  attachment,
  onOpen,
  onRemove,
}: {
  index: number;
  attachment: PastedAttachment;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const lineCount = attachment.content.split("\n").length;
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer max-w-[220px]"
    >
      <IconFileText className="h-4 w-4 shrink-0 text-muted-foreground" stroke={1.5} />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-medium">Pasted text {index}</span>
        <span className="truncate text-[10px] text-muted-foreground">
          {lineCount} lines · {attachment.content.length.toLocaleString()} chars
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
      >
        <IconX className="h-3.5 w-3.5" stroke={1.5} />
      </button>
    </div>
  );
}

function MessageBubble({ m, isStreaming }: { m: ChatMessage; isStreaming?: boolean }) {
  const isUser = m.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(m.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className="group relative min-w-0 max-w-[75%]">
        {isUser ? (
          <div className="rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground whitespace-pre-wrap">
            {m.content}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-2xl bg-muted/30 px-4 py-2.5 text-sm [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_p]:my-0 [&_ul]:my-1 [&_ul]:pl-4 [&_pre]:relative [&_pre]:bg-[#0b0f19] [&_pre]:text-[#e2e8f0] [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:my-2 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className ?? "");
                  const isInline = !match && !className?.includes("language-");
                  if (isInline)
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  return (
                    <div className="relative group/pre">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
                          toast.success("Code copied");
                        }}
                        className="absolute right-2 top-2 rounded-md bg-white/10 px-2 py-1 text-[10px] text-white/60 hover:bg-white/20 hover:text-white"
                      >
                        <IconCopy className="h-3.5 w-3.5 inline" stroke={1.5} />
                      </button>
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </div>
                  );
                },
              }}
            >
              {m.content}
            </ReactMarkdown>
          </div>
        )}
        {!isUser && !isStreaming && (
          <button
            onClick={copy}
            className="mt-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            {copied ? "Copied!" : <IconCopy className="h-3.5 w-3.5 inline" stroke={1.5} />}
          </button>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
