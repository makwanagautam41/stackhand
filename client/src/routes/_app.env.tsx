import { uuid } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { IconEye, IconEyeOff, IconFileText, IconPlus, IconTrash, IconUpload } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { useWorkspaces } from "@/lib/workspace-store";
import type { EnvFileEntry, EnvVar } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/env")({
  component: EnvPage,
  head: () => ({ meta: [{ title: "Env files · Stackhand" }] }),
});

function EnvPage() {
  const { current, envFilesByWs, updateEnvFile, addEnvFile } = useWorkspaces();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importName, setImportName] = useState(".env");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!current) return null;
  const files = envFilesByWs[current.id] ?? [];

  const parseEnvContent = (text: string): EnvVar[] => {
    return text
      .split("\n")
      .filter((l) => l.trim() && !l.startsWith("#"))
      .map((l) => {
        const eqIdx = l.indexOf("=");
        if (eqIdx === -1) return { key: l.trim(), value: "", secret: false };
        const key = l.slice(0, eqIdx).trim();
        const value = l.slice(eqIdx + 1).trim();
        return {
          key,
          value,
          secret: /pass|secret|token|key|password/i.test(key),
        };
      });
  };

  const doImport = () => {
    const vars = parseEnvContent(importText);
    const entry: EnvFileEntry = {
      id: uuid(),
      path: importName,
      vars,
    };
    addEnvFile(current.id, entry);
    setImportOpen(false);
    setImportText("");
    toast.success(`Imported ${vars.length} variables`);
  };

  const importFromFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const vars = parseEnvContent(text);
      const entry: EnvFileEntry = {
        id: uuid(),
        path: file.name,
        vars,
      };
      addEnvFile(current.id, entry);
      toast.success(`Imported ${vars.length} variables from ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Env files</h1>
          <p className="text-sm text-muted-foreground">
            Manage <span className="font-mono">.env</span> files per stack with secret masking.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="rounded-md" onClick={() => setImportOpen(true)}>
            <IconUpload className="mr-1.5 h-4 w-4" stroke={1.75} /> Import
          </Button>
          <Button variant="outline" className="rounded-md" onClick={importFromFile}>
            <IconUpload className="mr-1.5 h-4 w-4" stroke={1.75} /> Import File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".env,.env.example,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {files.length === 0 ? (
        <EmptyState icon={IconFileText} title="No env files" description="Import a .env file to get started." />
      ) : (
        <div className="space-y-4">
          {files.map((f) => (
            <EnvFileCard key={f.id} file={f} onChange={(vars) => updateEnvFile(current.id, f.id, vars)} />
          ))}
        </div>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Import .env variables</DialogTitle>
            <DialogDescription>Paste .env file contents. Each KEY=value pair will be parsed automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={importName} onChange={(e) => setImportName(e.target.value)} className="rounded-md font-mono" />
            <Textarea
              rows={10}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"KEY=value\nAPI_TOKEN=xxx\nDATABASE_URL=postgres://..."}
              className="rounded-md font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Lines starting with # are ignored. Variables matching pass/secret/token/key are auto-masked.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)} className="rounded-md">Cancel</Button>
            <Button onClick={doImport} className="rounded-md">Import {parseEnvContent(importText).length} vars</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EnvFileCard({ file, onChange }: { file: EnvFileEntry; onChange: (vars: EnvVar[]) => void }) {
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  const update = (idx: number, patch: Partial<EnvVar>) => {
    const next = file.vars.map((v, i) => (i === idx ? { ...v, ...patch } : v));
    onChange(next);
  };
  const add = () => onChange([...file.vars, { key: "NEW_KEY", value: "", secret: false }]);
  const remove = (idx: number) => onChange(file.vars.filter((_, i) => i !== idx));

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconFileText className="h-4 w-4 text-muted-foreground" stroke={1.75} />
          <span className="font-mono text-sm font-medium">{file.path}</span>
          {file.stackName && (
            <Badge variant="outline" className="font-mono text-[10px]">{file.stackName}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Switch checked={showAll} onCheckedChange={setShowAll} /> reveal all
          </Label>
          <Button size="sm" variant="outline" onClick={add} className="rounded-md">
            <IconPlus className="mr-1.5 h-3.5 w-3.5" stroke={2} /> Add
          </Button>
        </div>
      </div>
      <div className="divide-y rounded-md border">
        {file.vars.map((v, i) => {
          const shown = showAll || reveal[i] || !v.secret;
          return (
            <div key={i} className="flex items-center gap-2 p-2">
              <Input
                value={v.key}
                onChange={(e) => update(i, { key: e.target.value })}
                className="h-8 max-w-[180px] rounded-md font-mono text-xs"
              />
              <span className="text-muted-foreground">=</span>
              <Input
                type={shown ? "text" : "password"}
                value={v.value}
                onChange={(e) => update(i, { value: e.target.value })}
                className={cn("h-8 flex-1 rounded-md font-mono text-xs", v.secret && "border-amber-500/30")}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md"
                onClick={() => setReveal((p) => ({ ...p, [i]: !p[i] }))}>
                {shown ? <IconEyeOff className="h-3.5 w-3.5" stroke={1.75} /> : <IconEye className="h-3.5 w-3.5" stroke={1.75} />}
              </Button>
              <Label className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                <Switch checked={!!v.secret} onCheckedChange={(val) => update(i, { secret: Boolean(val) })} /> secret
              </Label>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md hover:text-destructive" onClick={() => remove(i)}>
                <IconTrash className="h-3.5 w-3.5" stroke={1.75} />
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
