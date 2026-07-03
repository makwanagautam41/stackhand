import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconPhoto, IconTrash, IconRefresh, IconSearch } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  }, []);

  const removeImage = async (img: BackendImage) => {
    const tag = img.tags?.[0] ?? img.id;
    setBusy((b) => ({ ...b, [tag]: true }));
    try {
      await api.removeImage(tag);
      toast.success(`Removed ${tag}`);
      await fetchImages(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy((b) => ({ ...b, [tag]: false }));
      setRemoveFor(null);
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
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={isBusy}
                          onClick={() => setRemoveFor(img)}
                        >
                          <IconTrash className="h-4 w-4" stroke={1.75} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

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
