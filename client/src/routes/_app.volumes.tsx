import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  IconDatabase,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconEraser,
  IconFile,
  IconFolder,
  IconFolderOpen,
  IconChevronRight,
  IconChevronDown,
  IconArrowLeft,
  IconArchive,
} from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageSkeleton } from "@/components/page-skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/volumes")({
  component: VolumesPage,
  head: () => ({
    meta: [
      { title: "Volumes · Stackhand" },
      { name: "description", content: "Docker volumes management." },
    ],
  }),
});

interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
  scope: string;
  size: number;
  refCount: number;
  created: string;
  labels: Record<string, string>;
}

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  mode: string;
  modifiedAt: string;
  createdAt: string;
}

function VolumesPage() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [removeFor, setRemoveFor] = useState<Volume | null>(null);
  const [pruneOpen, setPruneOpen] = useState(false);
  const [selectedVolume, setSelectedVolume] = useState<Volume | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; content: string } | null>(null);
  const [usage, setUsage] = useState<{ totalFiles: number; totalSize: number; mountpoint: string } | null>(null);

  const fetchVolumes = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.listVolumes();
      setVolumes(data);
    } catch (e: any) {
      if (!silent) toast.error(`Failed to load volumes: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolumes();
  }, []);

  const openVolume = async (v: Volume) => {
    setSelectedVolume(v);
    setCurrentPath("");
    browseVolumeFiles(v.name, "");
    try {
      const u = await api.getVolumeUsage(v.name);
      setUsage(u);
    } catch {
      setUsage(null);
    }
  };

  const browseVolumeFiles = async (name: string, subPath: string) => {
    setFilesLoading(true);
    try {
      const data = await api.browseVolumeFiles(name, subPath) as any;
      if (data.error) {
        setFiles([]);
        toast.error(data.error);
      } else {
        setFiles(Array.isArray(data) ? data as FileEntry[] : (data.files ?? []) as FileEntry[]);
      }
      setCurrentPath(subPath);
    } catch (e: any) {
      toast.error(e.message);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const navigateDir = (entry: FileEntry) => {
    if (entry.type === "directory" && selectedVolume) {
      browseVolumeFiles(selectedVolume.name, entry.path);
    }
  };

  const goBack = () => {
    if (!selectedVolume) return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const parent = parts.join("/");
    browseVolumeFiles(selectedVolume.name, parent);
  };

  const openFile = async (entry: FileEntry) => {
    if (!selectedVolume || entry.type === "directory") return;
    try {
      const data = await api.readVolumeFile(selectedVolume.name, entry.path);
      setPreviewFile({ name: entry.name, content: data.content });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const goHome = () => {
    setSelectedVolume(null);
    setCurrentPath("");
    setFiles([]);
  };

  const doRemove = async (v: Volume) => {
    try {
      await api.removeVolume(v.name);
      toast.success(`Removed volume ${v.name}`);
      await fetchVolumes(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRemoveFor(null);
    }
  };

  const doPrune = async () => {
    try {
      const result = await api.pruneVolumes();
      toast.success("Unused volumes pruned");
      await fetchVolumes(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPruneOpen(false);
    }
  };

  const filtered = useMemo(() => {
    if (!q) return volumes;
    const lq = q.toLowerCase();
    return volumes.filter((v) => v.name.toLowerCase().includes(lq) || v.driver.toLowerCase().includes(lq));
  }, [volumes, q]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  if (selectedVolume) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={goHome} className="rounded-md">
              <IconArrowLeft className="h-4 w-4" stroke={1.75} />
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{selectedVolume.name}</h1>
              <p className="font-mono text-xs text-muted-foreground">{selectedVolume.mountpoint}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Badge variant="secondary" className="font-mono text-xs">{selectedVolume.driver}</Badge>
            <Badge variant="secondary" className="font-mono text-xs">{selectedVolume.scope}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
          <button onClick={goHome} className="hover:text-foreground">volumes</button>
          <span>/</span>
          <span className="text-foreground">{selectedVolume.name}</span>
          {currentPath && (
            <>
              <span>/</span>
              {currentPath.split("/").filter(Boolean).map((part, i, arr) => (
                <span key={i}>
                  <button
                    onClick={() => {
                      const upTo = arr.slice(0, i + 1).join("/");
                      browseVolumeFiles(selectedVolume.name, upTo);
                    }}
                    className="hover:text-foreground"
                  >
                    {part}
                  </button>
                  {i < arr.length - 1 && <span className="ml-1">/</span>}
                </span>
              ))}
            </>
          )}
        </div>

        {usage && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Files</p>
              <p className="text-lg font-semibold font-mono mt-1">{usage.totalFiles.toLocaleString()}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Size</p>
              <p className="text-lg font-semibold font-mono mt-1">{formatSize(usage.totalSize)}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Mountpoint</p>
              <p className="text-xs font-mono mt-1 truncate" title={usage.mountpoint}>{usage.mountpoint}</p>
            </Card>
          </div>
        )}

        <Card>
          {filesLoading ? (
            <PageSkeleton variant="editor" />
          ) : files.length === 0 ? (
            <div className="grid h-[300px] place-items-center">
              <div className="text-center">
                <IconArchive className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" stroke={1.5} />
                <div className="text-sm text-muted-foreground">Empty volume</div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPath && (
                    <TableRow className="cursor-pointer hover:bg-accent" onClick={goBack}>
                      <TableCell className="font-mono text-sm" colSpan={3}>
                        <span className="flex items-center gap-2 text-muted-foreground">..</span>
                      </TableCell>
                    </TableRow>
                  )}
                  {files.map((entry) => (
                    <TableRow
                      key={entry.path}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => entry.type === "directory" ? navigateDir(entry) : openFile(entry)}
                    >
                      <TableCell className="font-mono text-sm">
                        <span className="flex items-center gap-2">
                          {entry.type === "directory" ? (
                            <IconFolder className="h-4 w-4 text-amber-500" stroke={1.75} />
                          ) : (
                            <IconFile className="h-4 w-4 text-muted-foreground" stroke={1.75} />
                          )}
                          {entry.name}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {entry.type === "file" ? formatSize(entry.size) : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(entry.modifiedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">{previewFile?.name}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[400px]">
              <pre className="rounded-md bg-muted p-4 text-xs font-mono whitespace-pre-wrap">
                {previewFile?.content}
              </pre>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Volumes</h1>
          <p className="text-sm text-muted-foreground">
            Docker volumes on this host.{" "}
            <span className="font-medium">{volumes.length} volumes</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPruneOpen(true)}>
            <IconEraser className="mr-2 h-4 w-4" stroke={1.75} /> Prune
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchVolumes(true)}>
            <IconRefresh className="mr-2 h-4 w-4" stroke={1.75} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="relative w-full sm:w-72">
          <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" stroke={1.75} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search volumes…"
            className="pl-8"
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <PageSkeleton variant="editor" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>References</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="py-12 text-center">
                        <IconDatabase className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" stroke={1.5} />
                        <div className="text-sm text-muted-foreground">
                          {volumes.length === 0 ? "No Docker volumes found." : "No volumes match your search."}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((v) => (
                  <TableRow key={v.name} className="cursor-pointer hover:bg-accent" onClick={() => openVolume(v)}>
                    <TableCell className="font-medium font-mono text-sm max-w-[200px] truncate">
                      {v.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">{v.driver}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{v.scope}</TableCell>
                    <TableCell className="font-mono text-xs">{v.size > 0 ? formatSize(v.size) : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{v.refCount}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {v.created ? new Date(v.created).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRemoveFor(v)}
                      >
                        <IconTrash className="h-4 w-4" stroke={1.75} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!removeFor} onOpenChange={(v) => !v && setRemoveFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove volume?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeFor?.name} will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeFor && doRemove(removeFor)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pruneOpen} onOpenChange={setPruneOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Prune unused volumes?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove all unused local volumes. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={doPrune}
            >
              Prune
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
