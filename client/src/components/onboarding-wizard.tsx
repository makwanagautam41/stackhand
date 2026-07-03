import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconLoader2,
  IconPlugConnected,
  IconTerminal2,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { FolderPicker } from "@/components/folder-picker";
import { WORKSPACE_COLORS, WORKSPACE_ICONS, DEFAULT_MODELS } from "@/lib/mock-data";
import { getWorkspaceIcon } from "@/lib/icon-map";
import { useWorkspaces } from "@/lib/workspace-store";
import type { OllamaModel } from "@/lib/types";
import { IconSparkles } from "@tabler/icons-react";

const SECTIONS = ["Workspace", "Root folder", "Ollama"] as const;

export function OnboardingWizard({ onDone }: { onDone: () => void }) {
  const { addWorkspace, workspaces, refresh } = useWorkspaces();
  const navigate = useNavigate();
  const isFirst = workspaces.length === 0;

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(WORKSPACE_COLORS[0]);
  const [icon, setIcon] = useState(WORKSPACE_ICONS[0]);
  const [rootFolder, setRootFolder] = useState("/home/gautam-makwana/stackhand");
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [models, setModels] = useState<OllamaModel[]>(DEFAULT_MODELS.map((m) => ({ ...m })));
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [creating, setCreating] = useState(false);

  const IconComp = getWorkspaceIcon(icon);

  const canNext = useMemo(() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return rootFolder.trim().length > 0;
    return true;
  }, [step, name, rootFolder]);

  const runCheck = async () => {
    setChecking(true);
    setChecked(false);
    try {
      const status = await api.ollamaStatus();
      setChecked(true);
      setOllamaConnected(status.connected);
      if (status.connected) {
        toast.success("Connected to Ollama", {
          description: "Ollama server is running",
        });
      } else {
        toast.error("Ollama not connected", {
          description: status.error || "Could not reach Ollama",
        });
      }
    } catch (e: any) {
      setChecked(true);
      setOllamaConnected(false);
      toast.error("Failed to connect to Ollama", {
        description: e.message,
      });
    } finally {
      setChecking(false);
    }
  };

  const submit = async () => {
    setCreating(true);
    try {
      await api.createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
        rootFolderPath: rootFolder,
      });
      await refresh();
      toast.success(`Workspace "${name.trim()}" created`);
      onDone();
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* subtle grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <IconTerminal2 className="h-3.5 w-3.5" stroke={1.75} />
            {isFirst ? "init workspace" : "new workspace"}
            <span className="text-foreground/40">·</span>
            <span>
              {String(step + 1).padStart(2, "0")} / {String(SECTIONS.length).padStart(2, "0")}
            </span>
            <span className="text-foreground/40">·</span>
            <span className="text-foreground/70">{SECTIONS[step]}</span>
          </div>
          <div className="flex items-center gap-1">
            {isFirst && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-md font-mono text-xs"
                onClick={async () => {
                  await api.createWorkspace({
                    name: "sample-workspace",
                    description: "Sample workspace with starter content",
                    rootFolderPath: "/home/gautam-makwana/stackhand",
                  });
                  await refresh();
                  toast.success("Sample workspace loaded", {
                    description: "Workspace created with starter content.",
                  });
                  onDone();
                  navigate({ to: "/dashboard" });
                }}
              >
                <IconSparkles className="mr-1.5 h-3.5 w-3.5" stroke={1.75} /> Try sample
              </Button>
            )}
            {!isFirst && (
              <Button variant="ghost" size="sm" onClick={onDone} className="rounded-md">
                Cancel
              </Button>
            )}
          </div>
        </div>

        <Card className="flex-1 rounded-md border-border/70 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Create workspace</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Name it, give it a color, pick an icon.
                  </p>
                </div>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      Name
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="home-lab"
                      className="h-10 rounded-md font-mono"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      Description{" "}
                      <span className="normal-case text-muted-foreground/60">(optional)</span>
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What lives here?"
                      rows={2}
                      className="rounded-md"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        Color
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {WORKSPACE_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={cn(
                              "h-8 w-8 rounded-md border transition-all duration-150",
                              color === c
                                ? "border-foreground scale-105 ring-2 ring-foreground/10 ring-offset-2 ring-offset-background"
                                : "border-border/60 hover:scale-105",
                            )}
                            style={{ backgroundColor: c }}
                            aria-label={c}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        Icon
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {WORKSPACE_ICONS.map((i) => {
                          const I = getWorkspaceIcon(i);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setIcon(i)}
                              className={cn(
                                "grid h-8 w-8 place-items-center rounded-md border transition-colors duration-150",
                                icon === i
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border/60 text-muted-foreground hover:border-foreground/40 hover:bg-accent",
                              )}
                            >
                              <I className="h-4 w-4" stroke={1.75} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                    <span
                      className="grid h-10 w-10 place-items-center rounded-md text-white"
                      style={{ backgroundColor: color }}
                    >
                      <IconComp className="h-5 w-5" stroke={1.75} />
                    </span>
                    <div>
                      <div className="font-mono text-sm font-medium">
                        {name || "untitled-workspace"}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        preview · switcher entry
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Root folder</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Stackhand reads and manages YAML files inside this folder.
                  </p>
                </div>
                <FolderPicker value={rootFolder} onChange={setRootFolder} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Connect Ollama</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Optional. We'll look for a local server. You can add it later.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-md border p-4">
                  <div
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-md",
                      checked ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {checking ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : checked ? (
                      <IconCheck className="h-4 w-4" stroke={2} />
                    ) : (
                      <IconPlugConnected className="h-4 w-4" stroke={1.75} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm">
                      {checking
                        ? "checking localhost:11434…"
                        : checked
                          ? "http://localhost:11434"
                          : "not connected"}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {checked
                        ? `${models.length} models detected`
                        : "click check to look for a local server"}
                    </div>
                  </div>
                  <Button
                    onClick={runCheck}
                    disabled={checking}
                    variant="outline"
                    className="rounded-md"
                  >
                    {checked ? "Re-check" : "Check"}
                  </Button>
                </div>
                {checked && (
                  <div className="space-y-2">
                    <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      Enable models
                    </div>
                    <div className="overflow-hidden rounded-md border">
                      {models.map((m) => (
                        <label
                          key={m.id}
                          className="flex cursor-pointer items-center gap-3 border-b p-3 transition-colors last:border-b-0 hover:bg-accent/60"
                        >
                          <Checkbox
                            checked={m.enabled}
                            onCheckedChange={(v) =>
                              setModels((prev) =>
                                prev.map((x) =>
                                  x.id === m.id ? { ...x, enabled: Boolean(v) } : x,
                                ),
                              )
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-mono text-sm">{m.name}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {m.size}
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="rounded-md font-mono text-[10px] uppercase"
                          >
                            local
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-5 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-md"
          >
            <IconArrowLeft className="mr-2 h-4 w-4" stroke={1.75} /> Back
          </Button>

          <div className="flex items-center gap-1">
            {SECTIONS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-sm transition-all duration-200",
                  i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/50" : "w-3 bg-border",
                )}
              />
            ))}
          </div>

          {step < SECTIONS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-md"
            >
              Continue
              <IconArrowRight className="ml-2 h-4 w-4" stroke={1.75} />
            </Button>
          ) : (
            <Button onClick={submit} disabled={creating || !name.trim()} className="rounded-md">
              {creating ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconCheck className="mr-2 h-4 w-4" stroke={2} />
              )}
              Create workspace
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
