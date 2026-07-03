import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconCheck,
  IconCopy,
  IconDeviceFloppy,
  IconDownload,
  IconLoader2,
  IconPencil,
  IconSearch,
  IconShieldCheck,
  IconSparkles,
  IconWand,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// Very small YAML tokenizer for coloring — just enough for a pleasant view.
function highlightLine(line: string) {
  if (/^\s*#/.test(line)) {
    return <span className="text-muted-foreground/70 italic">{line || " "}</span>;
  }
  // key: value pattern
  const m = line.match(/^(\s*)([-]\s+)?([A-Za-z0-9_.\-]+)(:)(\s*)(.*)$/);
  if (m) {
    const [, indent, dash, key, colon, gap, rest] = m;
    return (
      <>
        <span>{indent}</span>
        {dash && <span className="text-fuchsia-400">{dash}</span>}
        <span className="text-sky-300">{key}</span>
        <span className="text-muted-foreground">{colon}</span>
        <span>{gap}</span>
        {colorValue(rest)}
      </>
    );
  }
  const dash = line.match(/^(\s*)(-\s+)(.*)$/);
  if (dash) {
    return (
      <>
        <span>{dash[1]}</span>
        <span className="text-fuchsia-400">{dash[2]}</span>
        {colorValue(dash[3])}
      </>
    );
  }
  return <span>{line || " "}</span>;
}

function colorValue(v: string) {
  if (!v) return null;
  if (/^["'].*["']$/.test(v)) return <span className="text-emerald-300">{v}</span>;
  if (/^(true|false|null|~)$/.test(v)) return <span className="text-amber-300">{v}</span>;
  if (/^-?\d+(\.\d+)?$/.test(v)) return <span className="text-amber-300">{v}</span>;
  return <span className="text-foreground/90">{v}</span>;
}

export function YamlEditor({
  value,
  filename = "docker-compose.yml",
  onSave,
  readOnly,
  onExplain,
  onFix,
}: {
  value: string;
  filename?: string;
  onSave?: (v: string) => void;
  readOnly?: boolean;
  onExplain?: (yaml: string) => void;
  onFix?: (yaml: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrap, setWrap] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  const source = editing ? draft : value;
  const lines = useMemo(() => source.split("\n"), [source]);
  const matchLines = useMemo(() => {
    if (!query) return new Set<number>();
    const q = query.toLowerCase();
    const s = new Set<number>();
    lines.forEach((l, i) => l.toLowerCase().includes(q) && s.add(i));
    return s;
  }, [lines, query]);

  const stats = useMemo(() => {
    const bytes = new Blob([source]).size;
    return `${lines.length} lines · ${bytes} B`;
  }, [source, lines.length]);

  const validate = () => {
    setValidating(true);
    setError(null);
    setTimeout(() => {
      setValidating(false);
      if (/\t/.test(source)) {
        setError("Tabs detected — YAML requires spaces for indentation.");
        toast.error("YAML validation failed");
        return;
      }
      // basic indent parity check
      const bad = source
        .split("\n")
        .findIndex((l) => l.length > 0 && /^ +/.test(l) && (l.match(/^ +/)?.[0].length ?? 0) % 2 !== 0);
      if (bad >= 0) {
        setError(`Odd indentation on line ${bad + 1} (use 2 spaces).`);
        toast.error("YAML validation failed");
        return;
      }
      toast.success("YAML is valid", { description: "No syntax issues detected." });
    }, 500);
  };

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      onSave?.(draft);
      setSaving(false);
      setEditing(false);
      toast.success("File saved");
    }, 400);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(source);
    toast.success("Copied to clipboard");
  };

  const download = () => {
    const blob = new Blob([source], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sync scroll between textarea, gutter, preview
  const syncScroll = (el: HTMLElement) => {
    if (gutterRef.current) gutterRef.current.scrollTop = el.scrollTop;
    if (previewRef.current) previewRef.current.scrollTop = el.scrollTop;
    if (textareaRef.current && el !== textareaRef.current)
      textareaRef.current.scrollTop = el.scrollTop;
  };

  return (
    <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-md border bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {filename}
          </div>
          {editing && (
            <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-amber-500">
              editing
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-md px-2"
            onClick={() => setShowSearch((v) => !v)}
          >
            <IconSearch className="h-3.5 w-3.5" stroke={1.75} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-md px-2"
            onClick={() => setWrap((v) => !v)}
            title="Toggle word wrap"
          >
            <span className="font-mono text-[10px]">{wrap ? "no-wrap" : "wrap"}</span>
          </Button>
          <Button size="sm" variant="ghost" className="h-7 rounded-md px-2" onClick={copy}>
            <IconCopy className="h-3.5 w-3.5" stroke={1.75} />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 rounded-md px-2" onClick={download}>
            <IconDownload className="h-3.5 w-3.5" stroke={1.75} />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          {onExplain && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 rounded-md px-2 text-xs"
              onClick={() => onExplain(source)}
            >
              <IconSparkles className="mr-1 h-3.5 w-3.5" stroke={1.75} /> Explain
            </Button>
          )}
          {onFix && error && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 rounded-md px-2 text-xs text-amber-500"
              onClick={() => onFix(source)}
            >
              <IconWand className="mr-1 h-3.5 w-3.5" stroke={1.75} /> Fix with AI
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-md px-2 text-xs"
            onClick={validate}
            disabled={validating}
          >
            {validating ? (
              <IconLoader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <IconShieldCheck className="mr-1 h-3.5 w-3.5" stroke={1.75} />
            )}
            Validate
          </Button>
          {!readOnly &&
            (editing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-md px-2 text-xs"
                  onClick={() => {
                    setDraft(value);
                    setEditing(false);
                    setError(null);
                  }}
                >
                  <IconX className="mr-1 h-3.5 w-3.5" stroke={1.75} /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={save}
                  disabled={saving || draft === value}
                  className="h-7 rounded-md px-2 text-xs"
                >
                  {saving ? (
                    <IconLoader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <IconDeviceFloppy className="mr-1 h-3.5 w-3.5" stroke={1.75} />
                  )}
                  Save
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="h-7 rounded-md px-2 text-xs"
              >
                <IconPencil className="mr-1 h-3.5 w-3.5" stroke={1.75} /> Edit
              </Button>
            ))}
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 border-b bg-muted/20 px-3 py-1.5">
          <IconSearch className="h-3.5 w-3.5 text-muted-foreground" stroke={1.75} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find in file…"
            className="h-7 rounded-sm border-0 bg-transparent px-1 font-mono text-xs shadow-none focus-visible:ring-0"
            autoFocus
          />
          <span className="font-mono text-[10px] text-muted-foreground">
            {query ? `${matchLines.size} match${matchLines.size === 1 ? "" : "es"}` : ""}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 rounded-md px-1.5"
            onClick={() => {
              setShowSearch(false);
              setQuery("");
            }}
          >
            <IconX className="h-3.5 w-3.5" stroke={1.75} />
          </Button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 border-b bg-destructive/10 px-3 py-1.5 font-mono text-[11px] text-destructive">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          {error}
        </div>
      )}

      {/* Editor body */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 flex font-mono text-[13px] leading-6">
          {/* Gutter */}
          <div
            ref={gutterRef}
            className="scrollbar-none w-12 shrink-0 overflow-hidden border-r bg-muted/30 py-3 text-right"
          >
            {lines.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "px-2 text-muted-foreground/60 tabular-nums",
                  matchLines.has(i) && "bg-amber-400/20 text-amber-500",
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Content area */}
          <div className="relative flex-1 overflow-hidden">
            {/* Highlighted preview (behind textarea or standalone) */}
            <div
              ref={previewRef}
              aria-hidden
              className={cn(
                "scrollbar-thin absolute inset-0 overflow-auto py-3 pl-3 pr-6",
                wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre",
                editing && "pointer-events-none",
              )}
            >
              {lines.map((l, i) => (
                <div
                  key={i}
                  className={cn(
                    "min-h-[1.5rem]",
                    matchLines.has(i) && "bg-amber-400/10",
                  )}
                >
                  {highlightLine(l)}
                </div>
              ))}
              <div className="h-6" />
            </div>

            {/* Editable textarea overlay (transparent text so highlight shows) */}
            {editing && (
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onScroll={(e) => syncScroll(e.currentTarget)}
                spellCheck={false}
                className={cn(
                  "scrollbar-thin absolute inset-0 resize-none bg-transparent py-3 pl-3 pr-6 text-transparent caret-primary outline-none",
                  wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre",
                )}
              />
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>YAML</span>
          <span>UTF-8</span>
          <span>Spaces: 2</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{stats}</span>
          {!error && !editing && (
            <span className="flex items-center gap-1 text-emerald-500">
              <IconCheck className="h-3 w-3" stroke={2} /> ok
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
