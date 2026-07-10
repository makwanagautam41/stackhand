import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconPhoto, IconTrash, IconRefresh, IconSearch, IconPlayerPlay } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { api } from "@/lib/api";
import { emitSync, onSync, SYNC_EVENTS } from "@/lib/utils";
import type { BackendImage } from "@/lib/types";

export const Route = createFileRoute("/_app/images")({
  component: ImagesPage,
  head: () => ({
    meta: [
      { title: "Images · Stackhand" },
      { name: "description", content: "Local Docker images." },
    ],
  }),
});

function ImagesPage() {
  const [images, setImages] = useState<BackendImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [removeFor, setRemoveFor] = useState<BackendImage | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  /* run container dialog */
  const [runImage, setRunImage] = useState<{ name: string } | null>(null);
  const [runPort, setRunPort] = useState("");
  const [runName, setRunName] = useState("");
  const [runEnv, setRunEnv] = useState<{ key: string; value: string }[]>([]);
  const [runVolumes, setRunVolumes] = useState<string[]>([]);
  const [runCmd, setRunCmd] = useState("");
  const [runCreating, setRunCreating] = useState(false);

  const fetchImages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.listImages();
      setImages(data);
    } catch (e: any) {
      if (!silent) toast.error(`Failed to load images: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
    const unsub = onSync(SYNC_EVENTS.IMAGES_CHANGED, () => fetchImages(true));
    return () => { unsub(); };
  }, []);

  const removeImage = async (img: BackendImage) => {
    const tag = img.tags?.[0] ?? img.id;
    setBusy((b) => ({ ...b, [tag]: true }));
    try {
      await api.removeImage(tag);
      toast.success(`Removed ${tag}`);
      await fetchImages(true);
      emitSync(SYNC_EVENTS.IMAGES_CHANGED, { action: "remove", tag });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy((b) => ({ ...b, [tag]: false }));
      setRemoveFor(null);
    }
  };

  const doRunContainer = async () => {
    if (!runImage) return;
    setRunCreating(true);
    try {
      const port = runPort ? parseInt(runPort, 10) : undefined;
      const env = runEnv.filter((e) => e.key).reduce((acc, e) => ({ ...acc, [e.key]: e.value }), {});
      const res = await api.createContainer({
        image: runImage.name,
        name: runName || undefined,
        port,
        env: Object.keys(env).length > 0 ? env : undefined,
        volumes: runVolumes.filter(Boolean).length > 0 ? runVolumes : undefined,
        cmd: runCmd ? runCmd.split(/\s+/) : undefined,
      });
      toast.success(`Container "${res.name}" started from ${runImage.name}`);
      setRunImage(null);
      setRunName("");
      setRunPort("");
      setRunEnv([]);
      setRunVolumes([]);
      setRunCmd("");
    } catch (e: any) {
      toast.error(`Failed to create container: ${e.message}`);
    } finally {
      setRunCreating(false);
    }
  };

  const filtered = useMemo(() => {
    if (!q) return images;
    const lq = q.toLowerCase();
    return images.filter((i) =>
      i.tags?.some((t) => t.toLowerCase().includes(lq)) || i.id.toLowerCase().includes(lq)
    );
  }, [images, q]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Docker Images</h1>
          <p className="text-sm text-muted-foreground">
            Local Docker images on this host. <span className="font-medium">{images.length} images</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchImages(true)}>
          <IconRefresh className="mr-2 h-4 w-4" stroke={1.75} /> Refresh
        </Button>
      </div>

      <Card className="p-3">
        <div className="relative w-full sm:w-72">
          <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" stroke={1.75} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search images by name or ID…"
            className="pl-8"
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading images from Docker…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Image ID</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="py-12 text-center">
                        <IconPhoto className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" stroke={1.5} />
                        <div className="text-sm text-muted-foreground">
                          {images.length === 0 ? "No Docker images found." : "No images match your search."}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((img) => {
                  const tag = img.tags?.[0] ?? "untagged";
                  const [repo, ...tagParts] = tag.split(":");
                  const tagVal = tagParts.join(":") || "latest";
                  const isBusy = busy[tag];
                  return (
                    <TableRow key={img.id}>
                      <TableCell className="font-medium font-mono text-sm">{repo}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">{tagVal}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {img.id.slice(7, 19)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{formatSize(img.size)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(img.created * 1000).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRunImage({ name: tag })}
                            title="Run container from this image"
                          >
                            <IconPlayerPlay className="h-4 w-4" stroke={1.75} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={isBusy}
                            onClick={() => setRemoveFor(img)}
                          >
                            <IconTrash className="h-4 w-4" stroke={1.75} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* run container dialog */}
      <Dialog open={!!runImage} onOpenChange={(o) => { if (!o) { setRunImage(null); setRunName(""); setRunPort(""); setRunEnv([]); setRunVolumes([]); setRunCmd(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Run Container</DialogTitle>
            <DialogDescription className="font-mono">{runImage?.name}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">Basic</TabsTrigger>
              <TabsTrigger value="env" className="flex-1">Env</TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label>Container name (optional)</Label>
                <Input
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  placeholder={runImage?.name.split("/").pop()?.split(":")[0] || "my-container"}
                />
              </div>
              <div className="space-y-1">
                <Label>Port (optional)</Label>
                <Input
                  value={runPort}
                  onChange={(e) => setRunPort(e.target.value)}
                  placeholder="e.g. 8080"
                  type="number"
                />
                <p className="text-xs text-muted-foreground">Exposes container port on the same host port</p>
              </div>
            </TabsContent>
            <TabsContent value="env" className="space-y-3 pt-3">
              {runEnv.map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={e.key}
                    onChange={(ev) => setRunEnv((prev) => prev.map((r, j) => j === i ? { ...r, key: ev.target.value } : r))}
                    placeholder="KEY"
                    className="font-mono text-xs flex-1"
                  />
                  <span className="text-muted-foreground">=</span>
                  <Input
                    value={e.value}
                    onChange={(ev) => setRunEnv((prev) => prev.map((r, j) => j === i ? { ...r, value: ev.target.value } : r))}
                    placeholder="value"
                    className="font-mono text-xs flex-1"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRunEnv((prev) => prev.filter((_, j) => j !== i))}>
                    <IconTrash className="h-3.5 w-3.5" stroke={1.75} />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setRunEnv((prev) => [...prev, { key: "", value: "" }])}>
                Add env variable
              </Button>
            </TabsContent>
            <TabsContent value="advanced" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label>Volumes (one per line, e.g. /host:/container)</Label>
                <textarea
                  value={runVolumes.join("\n")}
                  onChange={(e) => setRunVolumes(e.target.value.split("\n"))}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                  placeholder={"/host/path:/container/path"}
                />
              </div>
              <div className="space-y-1">
                <Label>Command (optional)</Label>
                <Input
                  value={runCmd}
                  onChange={(e) => setRunCmd(e.target.value)}
                  placeholder="e.g. --port 8080 --verbose"
                  className="font-mono text-xs"
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRunImage(null); setRunName(""); setRunPort(""); setRunEnv([]); setRunVolumes([]); setRunCmd(""); }}>Cancel</Button>
            <Button onClick={doRunContainer} disabled={runCreating}>
              {runCreating ? "Creating…" : "Create & Start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeFor} onOpenChange={(v) => !v && setRemoveFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove image?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeFor?.tags?.[0] ?? "untagged"} will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeFor && removeImage(removeFor)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
