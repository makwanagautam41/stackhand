import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconDatabase, IconRefresh, IconSearch, IconTrash, IconEraser } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function VolumesPage() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [removeFor, setRemoveFor] = useState<Volume | null>(null);
  const [pruneOpen, setPruneOpen] = useState(false);

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

  const totalSize = volumes.reduce((s, v) => s + v.size, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Volumes</h1>
          <p className="text-sm text-muted-foreground">
            Docker volumes on this host.{" "}
            <span className="font-medium">{volumes.length} volumes</span>
            {totalSize > 0 && (
              <span className="text-muted-foreground"> · {formatSize(totalSize)} total</span>
            )}
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
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading volumes from Docker…
          </div>
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
                  <TableRow key={v.name}>
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
                      {new Date(v.created).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
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
