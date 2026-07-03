import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconArchive,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconDots,
  IconEye,
  IconEyeOff,
  IconFile,
  IconFolder,
  IconFolderOpen,
  IconFolderPlus,
  IconKey,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { YamlEditor } from "@/components/yaml-editor";
import { PageSkeleton } from "@/components/page-skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspaces } from "@/lib/workspace-store";
import { listBackups, recordBackup, type BackupRow } from "@/lib/sqlite";
import type { EnvVar, YamlFile } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/yaml")({
  component: YamlPage,
  head: () => ({
    meta: [
      { title: "YAML Explorer · Stackhand" },
      { name: "description", content: "Browse and edit YAML files across your workspace." },
    ],
  }),
});

// Loose type for the File System Access API — not in lib.dom for all TS versions.
type DirHandle = {
  name: string;
  getFileHandle: (
    name: string,
    opts?: { create?: boolean },
  ) => Promise<{ createWritable: () => Promise<{ write: (d: string) => Promise<void>; close: () => Promise<void> }> }>;
};

function YamlPage() {
  const {
    current,
    treeByWs,
    updateYamlFile,
    updateYamlEnv,
    renameYamlNode,
    deleteYamlNode,
    duplicateYamlNode,
    createYamlChild,
    pushActivity,
    hydrated,
  } = useWorkspaces();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renameFor, setRenameFor] = useState<YamlFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteFor, setDeleteFor] = useState<YamlFile | null>(null);
  const [createFor, setCreateFor] = useState<{ parent: YamlFile; isDir: boolean } | null>(null);
  const [createValue, setCreateValue] = useState("");

  if (!hydrated) return <PageSkeleton variant="editor" />;
  if (!current) return null;
  const tree = treeByWs[current.id];
  if (!tree) return <PageSkeleton variant="editor" />;

  const findFile = (node: YamlFile): YamlFile | null => {
    if (node.id === selectedId) return node;
    for (const c of node.children ?? []) {
      const f = findFile(c);
      if (f) return f;
    }
    return null;
  };
  const selected = selectedId ? findFile(tree) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">YAML Explorer</h1>
          <p className="text-mono text-xs text-muted-foreground">
            root: {current.rootFolder}
          </p>
        </div>
        {selected && !selected.isDir && (
          <BackupMenu
            workspaceId={current.id}
            file={selected}
            onBackedUp={(loc) =>
              pushActivity(current.id, {
                kind: "edit",
                message: `backup: ${selected.name} → ${loc}`,
              })
            }
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-4 xl:col-span-3">
          <div className="flex items-center justify-between border-b px-2 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              files
            </span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                title="New file at root"
                onClick={() => {
                  setCreateFor({ parent: tree, isDir: false });
                  setCreateValue("new-file.yml");
                }}
              >
                <IconFile className="h-3.5 w-3.5" stroke={1.75} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                title="New folder at root"
                onClick={() => {
                  setCreateFor({ parent: tree, isDir: true });
                  setCreateValue("new-folder");
                }}
              >
                <IconFolderPlus className="h-3.5 w-3.5" stroke={1.75} />
              </Button>
            </div>
          </div>
          <div className="p-2">
            <FileTree
              node={tree}
              level={0}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAction={(node, action) => {
                if (action === "delete") setDeleteFor(node);
                if (action === "duplicate") {
                  const id = duplicateYamlNode(current.id, node.id);
                  if (id) {
                    setSelectedId(id);
                    toast.success(`Duplicated ${node.name}`);
                  }
                }
                if (action === "rename") {
                  setRenameFor(node);
                  setRenameValue(node.name);
                }
                if (action === "new-file") {
                  setCreateFor({ parent: node, isDir: false });
                  setCreateValue("new-file.yml");
                }
                if (action === "new-folder") {
                  setCreateFor({ parent: node, isDir: true });
                  setCreateValue("new-folder");
                }
              }}
            />
          </div>
        </Card>

        <div className="lg:col-span-8 xl:col-span-9">
          {selected && !selected.isDir ? (
            <Tabs defaultValue="yaml" className="flex flex-col gap-3">
              <TabsList className="w-fit">
                <TabsTrigger value="yaml" className="gap-1.5 font-mono text-xs">
                  <IconFile className="h-3.5 w-3.5" stroke={1.75} /> {selected.name}
                </TabsTrigger>
                <TabsTrigger value="env" className="gap-1.5 font-mono text-xs">
                  <IconKey className="h-3.5 w-3.5" stroke={1.75} /> .env
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {selected.env?.length ?? 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="backups" className="gap-1.5 font-mono text-xs">
                  <IconArchive className="h-3.5 w-3.5" stroke={1.75} /> backups
                </TabsTrigger>
              </TabsList>
              <TabsContent value="yaml" className="mt-0">
                <YamlEditor
                  value={selected.content}
                  filename={selected.name}
                  onSave={(v) => updateYamlFile(current.id, selected.id, v)}
                />
              </TabsContent>
              <TabsContent value="env" className="mt-0">
                <EnvEditor
                  file={selected}
                  onChange={(env) => updateYamlEnv(current.id, selected.id, env)}
                />
              </TabsContent>
              <TabsContent value="backups" className="mt-0">
                <BackupsList workspaceId={current.id} filePath={selected.path} />
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="grid h-[420px] place-items-center">
              <div className="text-center">
                <IconFile
                  className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
                  stroke={1.75}
                />
                <div className="text-sm font-medium">Select a YAML file</div>
                <div className="text-xs text-muted-foreground">
                  Pick a file from the tree to view, edit, back up, or manage its .env.
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <RenameDialog
        node={renameFor}
        value={renameValue}
        onValue={setRenameValue}
        onClose={() => setRenameFor(null)}
        onConfirm={() => {
          if (renameFor && renameValue.trim()) {
            renameYamlNode(current.id, renameFor.id, renameValue.trim());
            toast.success(`Renamed to ${renameValue.trim()}`);
          }
          setRenameFor(null);
        }}
      />
      <DeleteDialog
        node={deleteFor}
        onClose={() => setDeleteFor(null)}
        onConfirm={() => {
          if (deleteFor) {
            if (selectedId === deleteFor.id) setSelectedId(null);
            deleteYamlNode(current.id, deleteFor.id);
            toast.success(`Deleted ${deleteFor.name}`);
          }
          setDeleteFor(null);
        }}
      />
      <CreateDialog
        state={createFor}
        value={createValue}
        onValue={setCreateValue}
        onClose={() => setCreateFor(null)}
        onConfirm={() => {
          if (createFor && createValue.trim()) {
            const id = createYamlChild(
              current.id,
              createFor.parent.id,
              createValue.trim(),
              createFor.isDir,
            );
            if (id && !createFor.isDir) setSelectedId(id);
            toast.success(`Created ${createValue.trim()}`);
          }
          setCreateFor(null);
        }}
      />
    </div>
  );
}

function RenameDialog({
  node,
  value,
  onValue,
  onClose,
  onConfirm,
}: {
  node: YamlFile | null;
  value: string;
  onValue: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!node} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">Rename {node?.name}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => onValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
          className="font-mono text-sm"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Rename</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  node,
  onClose,
  onConfirm,
}: {
  node: YamlFile | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={!!node} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {node?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the {node?.isDir ? "folder and all its contents" : "file"} from
            this workspace. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CreateDialog({
  state,
  value,
  onValue,
  onClose,
  onConfirm,
}: {
  state: { parent: YamlFile; isDir: boolean } | null;
  value: string;
  onValue: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">
            New {state?.isDir ? "folder" : "file"} in {state?.parent.name}
          </DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => onValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
          className="font-mono text-sm"
          placeholder={state?.isDir ? "folder-name" : "compose.yml"}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Backup ─────────────── */

function BackupMenu({
  workspaceId,
  file,
  onBackedUp,
}: {
  workspaceId: string;
  file: YamlFile;
  onBackedUp: (location: string) => void;
}) {
  const backupName = () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${file.name.replace(/\.ya?ml$/i, "")}.${stamp}.yml`;
  };

  const defaultBackup = async () => {
    const name = backupName();
    const location = "./backups";
    const blob = new Blob([file.content], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    await recordBackup({
      id: crypto.randomUUID(),
      workspaceId,
      filePath: file.path,
      location: `${location}/${name}`,
      size: blob.size,
      ts: Date.now(),
    });
    toast.success("Backup created", { description: `${location}/${name}` });
    onBackedUp(`${location}/${name}`);
  };

  const customBackup = async () => {
    const w = window as unknown as {
      showDirectoryPicker?: (opts?: { mode?: string }) => Promise<DirHandle>;
    };
    if (!w.showDirectoryPicker) {
      toast.error("Not supported", {
        description: "This browser can’t open a folder picker — falling back to download.",
      });
      return defaultBackup();
    }
    try {
      const dir = await w.showDirectoryPicker({ mode: "readwrite" });
      const name = backupName();
      const handle = await dir.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(file.content);
      await writable.close();
      const location = `${dir.name}/${name}`;
      await recordBackup({
        id: crypto.randomUUID(),
        workspaceId,
        filePath: file.path,
        location,
        size: new Blob([file.content]).size,
        ts: Date.now(),
      });
      toast.success("Backup saved", { description: location });
      onBackedUp(location);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      toast.error("Backup failed", { description: (e as Error).message });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1.5">
          <IconArchive className="h-3.5 w-3.5" stroke={1.75} />
          Backup
          <IconChevronDown className="h-3 w-3" stroke={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider">
          Manual backup
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={defaultBackup} className="gap-2">
          <IconFolder className="h-4 w-4" stroke={1.75} />
          <div className="flex flex-col">
            <span>Default location</span>
            <span className="font-mono text-[10px] text-muted-foreground">./backups</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={customBackup} className="gap-2">
          <IconFolderPlus className="h-4 w-4" stroke={1.75} />
          <div className="flex flex-col">
            <span>Choose folder…</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              native picker
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BackupsList({ workspaceId, filePath }: { workspaceId: string; filePath: string }) {
  const [rows, setRows] = useState<BackupRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    listBackups(workspaceId, filePath).then((r) => !cancelled && setRows(r));
    return () => {
      cancelled = true;
    };
  }, [workspaceId, filePath]);

  if (!rows) {
    return (
      <Card className="p-3">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </Card>
    );
  }
  if (rows.length === 0) {
    return (
      <Card className="grid h-[220px] place-items-center text-center">
        <div>
          <IconArchive
            className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
            stroke={1.75}
          />
          <div className="text-sm font-medium">No backups yet</div>
          <div className="text-xs text-muted-foreground">
            Use the Backup button above to snapshot this file.
          </div>
        </div>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>backup history · sqlite</span>
        <span>{rows.length} entries</span>
      </div>
      <ScrollArea className="h-[280px]">
        <ul className="divide-y">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 px-3 py-2 font-mono text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <IconArchive className="h-3.5 w-3.5 text-muted-foreground" stroke={1.75} />
                <span className="truncate">{r.location}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{r.size} B</span>
                <span>{new Date(r.ts).toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </Card>
  );
}

/* ─────────────── Per-file .env editor ─────────────── */

function EnvEditor({
  file,
  onChange,
}: {
  file: YamlFile;
  onChange: (env: EnvVar[]) => void;
}) {
  const [showSecrets, setShowSecrets] = useState(false);
  const env = file.env ?? [];

  const update = (i: number, patch: Partial<EnvVar>) => {
    const next = env.map((e, idx) => (idx === i ? { ...e, ...patch } : e));
    onChange(next);
  };
  const remove = (i: number) => onChange(env.filter((_, idx) => idx !== i));
  const add = () => onChange([...env, { key: "NEW_KEY", value: "" }]);
  const copyDotEnv = async () => {
    const txt = env.map((e) => `${e.key}=${e.value}`).join("\n");
    await navigator.clipboard.writeText(txt);
    toast.success(".env copied");
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <IconKey className="h-3.5 w-3.5" stroke={1.75} />
          {file.path.replace(/\/[^/]+$/, "")}/.env
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            isolated
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-md px-2"
            onClick={() => setShowSecrets((v) => !v)}
          >
            {showSecrets ? (
              <IconEyeOff className="h-3.5 w-3.5" stroke={1.75} />
            ) : (
              <IconEye className="h-3.5 w-3.5" stroke={1.75} />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-md px-2"
            onClick={copyDotEnv}
          >
            <IconCopy className="h-3.5 w-3.5" stroke={1.75} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 rounded-md px-2 text-xs"
            onClick={add}
          >
            <IconPlus className="h-3.5 w-3.5" stroke={1.75} /> Add
          </Button>
        </div>
      </div>
      {env.length === 0 ? (
        <div className="grid h-[220px] place-items-center text-center">
          <div>
            <IconKey
              className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
              stroke={1.75}
            />
            <div className="text-sm font-medium">No variables</div>
            <div className="text-xs text-muted-foreground">
              This file has an empty, isolated .env.
            </div>
          </div>
        </div>
      ) : (
        <ScrollArea className="h-[320px]">
          <ul className="divide-y">
            {env.map((v, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-1.5">
                <Input
                  value={v.key}
                  onChange={(e) => update(i, { key: e.target.value })}
                  className="h-8 w-52 font-mono text-xs"
                  placeholder="KEY"
                />
                <span className="font-mono text-xs text-muted-foreground">=</span>
                <Input
                  value={v.value}
                  type={v.secret && !showSecrets ? "password" : "text"}
                  onChange={(e) => update(i, { value: e.target.value })}
                  className="h-8 flex-1 font-mono text-xs"
                  placeholder="value"
                />
                <Button
                  size="sm"
                  variant={v.secret ? "secondary" : "ghost"}
                  className="h-8 px-2 text-[10px]"
                  onClick={() => update(i, { secret: !v.secret })}
                  title="Mark as secret"
                >
                  secret
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => remove(i)}
                >
                  <IconTrash
                    className="h-3.5 w-3.5 text-destructive"
                    stroke={1.75}
                  />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </Card>
  );
}

/* ─────────────── Tree ─────────────── */

function FileTree({
  node,
  level,
  selectedId,
  onSelect,
  onAction,
}: {
  node: YamlFile;
  level: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAction: (node: YamlFile, a: "rename" | "delete" | "duplicate" | "new-file" | "new-folder") => void;
}) {
  const [open, setOpen] = useState(level < 2);
  const isSelected = node.id === selectedId;

  if (!node.isDir) {
    return (
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent",
          isSelected && "bg-accent",
        )}
        style={{ paddingLeft: level * 12 + 8 }}
      >
        <IconFile
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          stroke={1.75}
        />
        <button
          type="button"
          className="flex-1 truncate text-left"
          onClick={() => onSelect(node.id)}
        >
          {node.name}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <IconDots className="h-3.5 w-3.5" stroke={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction(node, "rename")}>
              <IconPencil className="mr-2 h-3.5 w-3.5" stroke={1.75} /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction(node, "duplicate")}>
              <IconCopy className="mr-2 h-3.5 w-3.5" stroke={1.75} /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onAction(node, "delete")}
            >
              <IconTrash className="mr-2 h-3.5 w-3.5" stroke={1.75} /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div>
      <div
        className="group flex items-center rounded-md pr-1 transition-colors hover:bg-accent"
        style={{ paddingLeft: level * 12 + 4 }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-1 py-1 text-sm text-left"
        >
          {open ? (
            <IconChevronDown className="h-3.5 w-3.5 shrink-0" stroke={1.75} />
          ) : (
            <IconChevronRight className="h-3.5 w-3.5 shrink-0" stroke={1.75} />
          )}
          {open ? (
            <IconFolderOpen
              className="h-3.5 w-3.5 shrink-0 text-foreground/70"
              stroke={1.75}
            />
          ) : (
            <IconFolder
              className="h-3.5 w-3.5 shrink-0 text-foreground/70"
              stroke={1.75}
            />
          )}
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {level > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <IconDots className="h-3.5 w-3.5" stroke={1.75} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction(node, "new-file")}>
                <IconFile className="mr-2 h-3.5 w-3.5" stroke={1.75} /> New file
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction(node, "new-folder")}>
                <IconFolderPlus className="mr-2 h-3.5 w-3.5" stroke={1.75} /> New folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction(node, "rename")}>
                <IconPencil className="mr-2 h-3.5 w-3.5" stroke={1.75} /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onAction(node, "delete")}
              >
                <IconTrash className="mr-2 h-3.5 w-3.5" stroke={1.75} /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {open &&
        (node.children ?? []).map((c) => (
          <FileTree
            key={c.id}
            node={c}
            level={level + 1}
            selectedId={selectedId}
            onSelect={onSelect}
            onAction={onAction}
          />
        ))}
    </div>
  );
}
