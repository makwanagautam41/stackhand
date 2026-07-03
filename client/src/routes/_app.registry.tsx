import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconBrandDocker,
  IconDownload,
  IconLoader2,
  IconSearch,
  IconStar,
  IconWorld,
} from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MOCK_REGISTRY } from "@/lib/mock-data";
import type { RegistryImage } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/registry")({
  component: RegistryPage,
  head: () => ({ meta: [{ title: "Registry · Stackhand" }] }),
});

function formatPulls(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

async function searchDockerHub(query: string): Promise<RegistryImage[]> {
  const url = query
    ? `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(query)}&page_size=24`
    : `https://hub.docker.com/v2/search/repositories/?query=library&page_size=24`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Docker Hub ${res.status}`);
  const json = (await res.json()) as {
    results: Array<{
      repo_name: string;
      short_description?: string;
      star_count: number;
      pull_count: number;
      is_official: boolean;
    }>;
  };
  return json.results.map((r) => {
    const [ns, name] = r.repo_name.includes("/")
      ? r.repo_name.split("/")
      : ["library", r.repo_name];
    return {
      namespace: ns,
      name,
      description: r.short_description ?? "",
      stars: r.star_count,
      pulls: formatPulls(r.pull_count),
      official: r.is_official,
      tags: [],
    };
  });
}

async function fetchTags(namespace: string, name: string): Promise<string[]> {
  const url = `https://hub.docker.com/v2/repositories/${namespace}/${name}/tags/?page_size=25&ordering=last_updated`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`tags ${res.status}`);
  const json = (await res.json()) as { results: Array<{ name: string }> };
  return json.results.map((t) => t.name);
}

function RegistryPage() {
  const [q, setQ] = useState("");
  const [images, setImages] = useState<RegistryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const [picked, setPicked] = useState<RegistryImage | null>(null);
  const [tag, setTag] = useState("latest");
  const [tagsLoading, setTagsLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchDockerHub(q.trim());
        if (!cancelled) {
          setImages(results);
          setLive(true);
        }
      } catch {
        if (!cancelled) {
          setImages(
            MOCK_REGISTRY.filter(
              (i) =>
                !q ||
                i.name.includes(q.toLowerCase()) ||
                i.description.toLowerCase().includes(q.toLowerCase()),
            ),
          );
          setLive(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const openPull = async (img: RegistryImage) => {
    setPicked(img);
    setTag("latest");
    if (img.tags.length === 0) {
      setTagsLoading(true);
      try {
        const tags = await fetchTags(img.namespace, img.name);
        const withDefault = tags.length ? tags : ["latest"];
        setPicked({ ...img, tags: withDefault });
        setTag(withDefault[0]);
      } catch {
        setPicked({ ...img, tags: ["latest"] });
      } finally {
        setTagsLoading(false);
      }
    } else {
      setTag(img.tags[0]);
    }
  };

  const pull = () => {
    setPulling(true);
    setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(t);
          setPulling(false);
          toast.success(`Pulled ${picked?.namespace}/${picked?.name}:${tag}`);
          setPicked(null);
          return 100;
        }
        return p + 10 + Math.random() * 15;
      });
    }, 250);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Image registry</h1>
          <p className="text-sm text-muted-foreground">
            Search Docker Hub and pull images.
          </p>
        </div>
        <Badge
          variant="outline"
          className="font-mono text-[10px] uppercase tracking-widest"
        >
          <IconWorld className="mr-1 h-3 w-3" stroke={1.75} />
          {live ? "hub.docker.com" : "offline · mock"}
        </Badge>
      </div>

      <div className="relative max-w-lg">
        {loading ? (
          <IconLoader2
            className="absolute left-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground"
            stroke={1.75}
          />
        ) : (
          <IconSearch
            className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            stroke={1.75}
          />
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search Docker Hub…"
          className="rounded-md pl-9 font-mono text-sm"
        />
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : images.length === 0 ? (
        <EmptyState icon={IconBrandDocker} title="No images match" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {images.map((img) => (
            <Card key={`${img.namespace}/${img.name}`} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-[#0db7ed]/10 text-[#0db7ed]">
                  <IconBrandDocker className="h-5 w-5" stroke={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-mono text-sm font-semibold">
                      {img.namespace}/{img.name}
                    </span>
                    {img.official && (
                      <Badge
                        variant="outline"
                        className="border-sky-500/40 font-mono text-[10px] uppercase text-sky-500"
                      >
                        official
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {img.description || "No description."}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <IconStar className="h-3 w-3" stroke={1.75} />{" "}
                  {img.stars.toLocaleString()}
                </span>
                <span>{img.pulls} pulls</span>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  className="rounded-md"
                  onClick={() => openPull(img)}
                >
                  <IconDownload className="mr-1.5 h-3.5 w-3.5" stroke={1.75} /> Pull
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!picked}
        onOpenChange={(v) => !v && !pulling && setPicked(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">
              Pull {picked?.namespace}/{picked?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Tag
              </div>
              {tagsLoading ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : (
                <Select value={tag} onValueChange={setTag}>
                  <SelectTrigger className="rounded-md font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {picked?.tags.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {pulling && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="font-mono text-[11px] text-muted-foreground">
                  Downloading layers… {Math.min(100, Math.round(progress))}%
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPicked(null)}
              disabled={pulling}
              className="rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={pull}
              disabled={pulling || tagsLoading}
              className="rounded-md"
            >
              <IconDownload className="mr-1.5 h-4 w-4" stroke={1.75} /> Pull
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

