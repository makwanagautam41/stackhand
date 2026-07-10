import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  FolderOpen,
  Monitor,
  Moon,
  Sun,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { FolderPicker } from "@/components/folder-picker";
import { useWorkspaces } from "@/lib/workspace-store";
import { useTheme, type Theme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { WORKSPACE_COLORS, WORKSPACE_ICONS } from "@/lib/constants";
import { getWorkspaceIcon } from "@/lib/icon-map";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings · Stackhand" },
      { name: "description", content: "Workspace, appearance, and Ollama settings." },
    ],
  }),
});

function SettingsPage() {
  const { current, updateWorkspace, deleteWorkspace, density, setDensity, exportAll, importAll } =
    useWorkspaces();
  const importRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(current?.name ?? "");
  const [color, setColor] = useState(current?.color ?? WORKSPACE_COLORS[0]);
  const [icon, setIcon] = useState(current?.icon ?? WORKSPACE_ICONS[0]);
  const [folderOpen, setFolderOpen] = useState(false);
  const [tempFolder, setTempFolder] = useState(current?.rootFolder ?? "/home/user");
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!current) return null;

  const save = async () => {
    try {
      await api.updateWorkspace(current.id, { name: name.trim() || current.name, color, icon });
      updateWorkspace(current.id, { name: name.trim() || current.name, color, icon });
      toast.success("Workspace updated");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update workspace");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure workspace, appearance, and integrations.
        </p>
      </div>

      <Tabs defaultValue="workspace">
        <TabsList className="rounded-md">
          <TabsTrigger value="workspace" className="rounded-md">Workspace</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-md">Appearance</TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-md">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Root folder</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input value={current.rootFolder} readOnly className="text-mono" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTempFolder(current.rootFolder);
                      setFolderOpen(true);
                    }}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" /> Change
                  </Button>
                </div>
              </div>
              <div>
                <Label>Color</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {WORKSPACE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        "h-8 w-8 rounded-lg border-2",
                        color === c ? "border-foreground scale-110" : "border-transparent",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>Icon</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {WORKSPACE_ICONS.map((i) => {
                    const I = getWorkspaceIcon(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIcon(i)}
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-lg border-2",
                          icon === i
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        <I className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Button onClick={save}>Save changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Delete this workspace</div>
                <div className="text-xs text-muted-foreground">
                  Removes all stacks and settings in {current.name}. Cannot be undone.
                </div>
              </div>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    { id: "light", label: "Light", Icon: Sun, preview: "from-white to-slate-100" },
                    { id: "dark", label: "Dark", Icon: Moon, preview: "from-slate-900 to-slate-800" },
                    { id: "system", label: "System", Icon: Monitor, preview: "from-slate-100 to-slate-900" },
                  ] as { id: Theme; label: string; Icon: typeof Sun; preview: string }[]
                ).map(({ id, label, Icon, preview }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all",
                      theme === id
                        ? "border-primary shadow-sm"
                        : "border-border hover:border-foreground/30",
                    )}
                  >
                    <div className={cn("h-20 bg-gradient-to-br", preview)} />
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      {theme === id && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Density</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["comfortable", "compact"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDensity(d);
                      toast.success(`${d} density enabled`);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-md border-2 p-4 text-left transition-colors",
                      density === d ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30",
                    )}
                  >
                    <div>
                      <div className="font-mono text-sm font-medium capitalize">{d}</div>
                      <div className="text-xs text-muted-foreground">
                        {d === "compact" ? "Tighter rows, smaller paddings" : "Roomy layout, easier scanning"}
                      </div>
                    </div>
                    {density === d && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Backup & restore</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-md"
                onClick={() => {
                  const blob = new Blob([exportAll()], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `stackhand-backup-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Backup exported");
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Export workspaces
              </Button>
              <input
                ref={importRef}
                type="file"
                accept="application/json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const text = await f.text();
                  const ok = importAll(text);
                  if (ok) toast.success("Import complete");
                  else toast.error("Invalid backup file");
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                className="rounded-md"
                onClick={() => importRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" /> Import backup
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change root folder</DialogTitle>
          </DialogHeader>
          <FolderPicker value={tempFolder} onChange={setTempFolder} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  await api.updateWorkspace(current.id, { rootFolderPath: tempFolder });
                  updateWorkspace(current.id, { rootFolderPath: tempFolder });
                  setFolderOpen(false);
                  toast.success("Root folder updated");
                } catch (e: any) {
                  toast.error(e.message ?? "Failed to update root folder");
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {current.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all stacks, YAML references, and chat history for this workspace.
              This action can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const id = current.id;
                try {
                  await api.deleteWorkspace(id);
                  deleteWorkspace(id);
                  setDeleteOpen(false);
                  toast.success("Workspace deleted");
                  navigate({ to: "/" });
                } catch (e: any) {
                  toast.error(e.message ?? "Failed to delete workspace");
                }
              }}
            >
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
