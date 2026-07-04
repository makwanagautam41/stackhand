import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  IconSearch,
  IconDownload,
  IconTag,
  IconStar,
  IconStarFilled,
  IconHistory,
  IconBrandDocker,
  IconFileDescription,
  IconDeviceFloppy,
  IconX,
  IconInfoCircle,
  IconArchive,
  IconPlayerPlay,
  IconLoader2,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/page-skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/registry")({
  component: RegistryPage,
  head: () => ({
    meta: [
      { title: "Registry · Stackhand" },
      { name: "description", content: "Docker Hub registry explorer." },
    ],
  }),
});

interface RegistryImage {
  name: string;
  namespace: string;
  repository: string;
  description: string;
  starCount: number;
  pullCount: number;
  isOfficial: boolean;
  isAutomated: boolean;
  logoUrl?: string;
}

interface TagInfo {
  name: string;
  size: number;
  lastUpdated: string;
  architecture: string;
  os: string;
  digest?: string;
}

interface PullTask {
  imageName: string;
  layers: { id: string; status: string; progress?: string; progressDetail?: any }[];
  status: "pulling" | "done" | "error";
  error?: string;
}

/* ── helpers ── */
const FAVORITES_KEY = "registry_favorites";

function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setFavorites(favs: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const POPULAR_SECTIONS = [
  {
    title: "Popular Images",
    query: "popular",
    images: [
      { name: "nginx", description: "Official Nginx web server" },
      { name: "postgres", description: "PostgreSQL database" },
      { name: "redis", description: "Redis in-memory store" },
      { name: "mongo", description: "MongoDB document database" },
      { name: "mysql", description: "MySQL database" },
      { name: "node", description: "Node.js runtime" },
      { name: "python", description: "Python interpreter" },
      { name: "ubuntu", description: "Ubuntu base image" },
      { name: "alpine", description: "Minimal Alpine Linux" },
      { name: "traefik", description: "Reverse proxy" },
      { name: "portainer", description: "Container management UI" },
      { name: "adminer", description: "Database admin tool" },
    ],
  },
  {
    title: "Databases & Storage",
    query: "database",
    images: [
      { name: "mariadb", description: "MariaDB database" },
      { name: "cockroachdb/cockroach", description: "CockroachDB" },
      { name: "influxdb", description: "Time-series database" },
      { name: "couchdb", description: "CouchDB" },
      { name: "neo4j", description: "Neo4j graph database" },
      { name: "clickhouse/clickhouse-server", description: "ClickHouse" },
      { name: "timescale/timescaledb", description: "TimescaleDB" },
      { name: "minio/minio", description: "S3-compatible storage" },
    ],
  },
  {
    title: "Web & Application Servers",
    query: "web",
    images: [
      { name: "httpd", description: "Apache HTTP Server" },
      { name: "caddy", description: "Caddy web server" },
      { name: "haproxy", description: "HAProxy load balancer" },
      { name: "tomcat", description: "Apache Tomcat" },
      { name: "jellyfin/jellyfin", description: "Media server" },
      { name: "nextcloud", description: "Cloud storage" },
    ],
  },
  {
    title: "Dev Tools & Languages",
    query: "devtools",
    images: [
      { name: "golang", description: "Go compiler" },
      { name: "rust", description: "Rust toolchain" },
      { name: "openjdk", description: "OpenJDK" },
      { name: "php", description: "PHP interpreter" },
      { name: "ruby", description: "Ruby interpreter" },
      { name: "elixir", description: "Elixir language" },
      { name: "gcc", description: "GNU Compiler Collection" },
      { name: "gitlab/gitlab-ce", description: "GitLab CE" },
    ],
  },
  {
    title: "Monitoring & Observability",
    query: "monitoring",
    images: [
      { name: "grafana/grafana", description: "Grafana analytics" },
      { name: "prom/prometheus", description: "Prometheus monitoring" },
      { name: "prom/node-exporter", description: "Node exporter" },
      { name: "thanosio/thanos", description: "Thanos" },
      { name: "loki", description: "Loki log aggregation" },
      { name: "jaegertracing/all-in-one", description: "Jaeger tracing" },
    ],
  },
];

/* ── component ── */
function RegistryPage() {
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<RegistryImage[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const DEBOUNCE_MS = 400;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined as any);

  /* details sheet */
  const [detailImage, setDetailImage] = useState<RegistryImage | null>(null);
  const [detailTags, setDetailTags] = useState<TagInfo[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  /* pull tasks (persistent across dialog opens) */
  const [pullTasks, setPullTasks] = useState<Record<string, PullTask>>({});
  const [activePullKey, setActivePullKey] = useState<string | null>(null);
  const eventSourceRef = useRef<Record<string, EventSource>>({});

  /* compose dialog */
  const [composeImage, setComposeImage] = useState<{ name: string; tag: string } | null>(null);
  const [composePort, setComposePort] = useState("");
  const [composeName, setComposeName] = useState("");
  const [composeYaml, setComposeYaml] = useState("");
  const [composeGenerating, setComposeGenerating] = useState(false);

  /* save dialog */
  const [saveImage, setSaveImage] = useState<{ name: string; yaml: string } | null>(null);
  const [saveFolder, setSaveFolder] = useState("");
  const [saving, setSaving] = useState(false);

  /* run container dialog */
  const [runImage, setRunImage] = useState<{ name: string; tag: string } | null>(null);
  const [runPort, setRunPort] = useState("");
  const [runName, setRunName] = useState("");
  const [runCreating, setRunCreating] = useState(false);

  /* favorites */
  const [favorites, setFavoritesState] = useState<string[]>(getFavorites);

  /* recently viewed */
  const [recentlyViewed, setRecentlyViewed] = useState<RegistryImage[]>(() => {
    try {
      const raw = sessionStorage.getItem("registry_recent");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const addToRecentlyViewed = (img: RegistryImage) => {
    setRecentlyViewed((prev) => {
      const next = [img, ...prev.filter((r) => r.name !== img.name)].slice(0, 10);
      sessionStorage.setItem("registry_recent", JSON.stringify(next));
      return next;
    });
  };

  const isFav = (name: string) => favorites.includes(name);

  const toggleFav = (name: string) => {
    const next = isFav(name) ? favorites.filter((f) => f !== name) : [...favorites, name];
    setFavoritesState(next);
    setFavorites(next);
  };

  /* search with debounce */
  const doSearch = useCallback(async (query: string, pageNum = 1) => {
    if (!query.trim()) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await api.registrySearch(query.trim(), pageNum);
      setSearchResults(res.results);
      setTotalResults(res.total);
      setPage(pageNum);
    } catch (e: any) {
      setSearchError(e.message);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchResults(null); setSearchError(null); return; }
    debounceRef.current = setTimeout(() => doSearch(q, 1), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, doSearch]);

  /* details */
  const openDetails = async (img: RegistryImage) => {
    setDetailImage(img);
    setDetailLoading(true);
    setDetailTags([]);
    addToRecentlyViewed(img);
    try {
      const [namespace, repo] = img.name.indexOf("/") >= 0
        ? img.name.split("/")
        : ["library", img.name];
      const tags = await api.registryTags(namespace, repo, 1, 100);
      setDetailTags(tags.results || []);
    } catch (e: any) {
      toast.error(`Failed to load tags: ${e.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  /* pull with SSE stream */
  const startPull = (name: string, tag: string) => {
    const key = `${name}:${tag}`;
    if (pullTasks[key]?.status === "pulling") return;

    const task: PullTask = { imageName: key, layers: [], status: "pulling" };
    setPullTasks((prev) => ({ ...prev, [key]: task }));
    setActivePullKey(key);

    const es = new EventSource(`/api/registry/pull-stream?name=${encodeURIComponent(key)}`);
    eventSourceRef.current[key] = es;

    es.addEventListener("progress", (e) => {
      try {
        const data = JSON.parse(e.data);
        setPullTasks((prev) => {
          const t = prev[key];
          if (!t) return prev;
          const existingIds = new Set(t.layers.map((l) => l.id));
          if (data.id && !existingIds.has(data.id)) {
            return { ...prev, [key]: { ...t, layers: [...t.layers, { id: data.id, status: data.status, progress: data.progress, progressDetail: data.progressDetail }] } };
          }
          return { ...prev, [key]: { ...t, layers: t.layers.map((l) => l.id === data.id ? { ...l, status: data.status, progress: data.progress, progressDetail: data.progressDetail } : l) } };
        });
      } catch {}
    });

    es.addEventListener("done", (e) => {
      es.close();
      delete eventSourceRef.current[key];
      setPullTasks((prev) => ({ ...prev, [key]: { ...prev[key], status: "done" } }));
      toast.success(`Pulled ${key}`);
    });

    es.addEventListener("error", (e) => {
      es.close();
      delete eventSourceRef.current[key];
      let msg = "Pull failed";
      try {
        const parsed = JSON.parse((e as MessageEvent).data);
        msg = parsed.message || msg;
      } catch {}
      setPullTasks((prev) => ({ ...prev, [key]: { ...prev[key], status: "error", error: msg } }));
      toast.error(msg);
    });

    es.onerror = () => {
      es.close();
      delete eventSourceRef.current[key];
      setPullTasks((prev) => {
        const t = prev[key];
        if (!t || t.status !== "pulling") return prev;
        toast.error(`Pull connection lost for ${key}`);
        return { ...prev, [key]: { ...t, status: "error", error: "Connection lost" } };
      });
    };
  };

  const activeTasks = Object.values(pullTasks).filter((t) => t.status === "pulling");
  const completedTasks = Object.values(pullTasks).filter((t) => t.status === "done" || t.status === "error");

  /* compose */
  const doGenerateCompose = async (name: string, tag: string) => {
    setComposeGenerating(true);
    try {
      const image = `${name}:${tag}`;
      const port = composePort ? parseInt(composePort, 10) : undefined;
      const res = await api.registryGenerateCompose({
        image,
        name: composeName || name.split("/").pop() || name,
        port,
      });
      setComposeYaml(res.yaml);
      setComposeName(res.name);
    } catch (e: any) {
      toast.error(`Compose generation failed: ${e.message}`);
    } finally {
      setComposeGenerating(false);
    }
  };

  /* save */
  const doSave = async () => {
    if (!saveImage || !saveFolder.trim()) return;
    setSaving(true);
    try {
      const res = await api.registrySaveToWorkspace({
        workspaceRoot: "",
        folderName: saveFolder.trim(),
        yaml: saveImage.yaml,
        description: `Stack for ${saveImage.name}`,
      });
      toast.success(`Saved to ${res.path}`);
      setSaveImage(null);
      setSaveFolder("");
    } catch (e: any) {
      toast.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  /* run container */
  const doRunContainer = async () => {
    if (!runImage) return;
    setRunCreating(true);
    try {
      const imageName = `${runImage.name}:${runImage.tag}`;
      const port = runPort ? parseInt(runPort, 10) : undefined;
      const res = await api.createContainer({
        image: imageName,
        name: runName || undefined,
        port,
      });
      toast.success(`Container "${res.name}" started from ${imageName}`);
      setRunImage(null);
      setRunName("");
      setRunPort("");
    } catch (e: any) {
      toast.error(`Failed to create container: ${e.message}`);
    } finally {
      setRunCreating(false);
    }
  };

  const totalPages = Math.ceil(totalResults / 25);

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-center gap-3">
        <IconBrandDocker className="h-6 w-6 text-primary" stroke={1.75} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Registry</h1>
          <p className="text-sm text-muted-foreground">Docker Hub image explorer</p>
        </div>
      </div>

      {/* active pull tasks indicator */}
      {activeTasks.length > 0 && (
        <Card className="p-3 border-primary/50 bg-primary/5">
          <div className="flex items-center gap-3">
            <IconLoader2 className="h-5 w-5 text-primary animate-spin" stroke={1.75} />
            <div className="text-sm font-medium">
              {activeTasks.length} pull{activeTasks.length > 1 ? "s" : ""} in progress
            </div>
            <div className="flex gap-1 ml-auto">
              {activeTasks.map((t) => (
                <Button key={t.imageName} size="sm" variant="outline" className="h-7 text-xs" onClick={() => setActivePullKey(t.imageName)}>
                  {t.imageName}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* completed tasks indicator */}
      {completedTasks.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            {completedTasks.length} completed pull{completedTasks.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-2 space-y-1">
            {completedTasks.map((t) => (
              <div key={t.imageName} className="flex items-center gap-2">
                {t.status === "done" ? (
                  <IconCheck className="h-3 w-3 text-green-500" stroke={2} />
                ) : (
                  <IconAlertTriangle className="h-3 w-3 text-destructive" stroke={2} />
                )}
                <span className="font-mono">{t.imageName}</span>
                {t.error && <span className="text-destructive">— {t.error}</span>}
                <Button size="sm" variant="ghost" className="h-5 text-xs ml-auto" onClick={() => setActivePullKey(t.imageName)}>
                  View
                </Button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* search */}
      <Card className="p-3">
        <div className="relative w-full sm:w-96">
          <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" stroke={1.75} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Docker Hub images…"
            className="pl-8"
          />
          {q && (
            <button
              onClick={() => { setQ(""); setSearchResults(null); setSearchError(null); }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <IconX className="h-4 w-4" stroke={1.75} />
            </button>
          )}
        </div>
      </Card>

      {/* search error */}
      {searchError && (
        <Card className="p-6 border-destructive/50">
          <div className="flex flex-col items-center gap-3 text-center">
            <IconInfoCircle className="h-8 w-8 text-destructive" stroke={1.5} />
            <div>
              <p className="text-sm font-medium">Search failed</p>
              <p className="text-xs text-muted-foreground mt-1">{searchError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => doSearch(q, page)}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* results */}
      {searchLoading && <PageSkeleton variant="editor" />}

      {searchResults !== null && !searchLoading && !searchError && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{totalResults.toLocaleString()} results for "<span className="text-foreground font-medium">{q}</span>"</span>
            <span className="text-xs">— page {page} of {Math.max(totalPages, 1)}</span>
          </div>

          {searchResults.length === 0 ? (
            <Card className="p-12">
              <div className="flex flex-col items-center gap-3 text-center">
                <IconArchive className="h-8 w-8 text-muted-foreground/50" stroke={1.5} />
                <p className="text-sm text-muted-foreground">No results found</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((img) => (
                <SearchCard
                  key={img.name}
                  img={img}
                  isFav={isFav(img.name)}
                  onToggleFav={() => toggleFav(img.name)}
                  onClick={() => openDetails(img)}
                  onPull={(tag) => startPull(img.name, tag)}
                  onDetails={() => openDetails(img)}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => doSearch(q, page - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => doSearch(q, page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* no search — popular + recent + favorites */}
      {searchResults === null && !searchLoading && (
        <>
          {recentlyViewed.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-base font-semibold mb-3">
                <IconHistory className="h-4 w-4 text-muted-foreground" stroke={1.75} />
                Recently Viewed
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recentlyViewed.map((img) => (
                  <SearchCard
                    key={img.name}
                    img={img}
                    isFav={isFav(img.name)}
                    onToggleFav={() => toggleFav(img.name)}
                    onClick={() => openDetails(img)}
                    onPull={(tag) => startPull(img.name, tag)}
                    onDetails={() => openDetails(img)}
                  />
                ))}
              </div>
            </section>
          )}

          {favorites.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-base font-semibold mb-3">
                <IconStarFilled className="h-4 w-4 text-amber-500" stroke={1.75} />
                Favorites
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {favorites.map((name) => (
                  <FavoriteCard
                    key={name}
                    name={name}
                    onClick={() => doSearch(name)}
                    onRemove={() => toggleFav(name)}
                  />
                ))}
              </div>
            </section>
          )}

          {POPULAR_SECTIONS.map((section) => (
            <section key={section.title}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold">{section.title}</h2>
                <Button variant="ghost" size="sm" onClick={() => { setQ(section.query); doSearch(section.query, 1); }}>
                  <IconSearch className="mr-2 h-4 w-4" stroke={1.75} /> See all
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.images.map((img) => {
                  const fullName = img.name;
                  const fakeImg: RegistryImage = {
                    name: fullName,
                    namespace: fullName.indexOf("/") >= 0 ? fullName.split("/")[0] : "library",
                    repository: fullName.indexOf("/") >= 0 ? fullName.split("/")[1] : fullName,
                    description: img.description,
                    starCount: 0,
                    pullCount: 0,
                    isOfficial: fullName.indexOf("/") < 0,
                    isAutomated: fullName.indexOf("/") >= 0,
                  };
                  return (
                    <SearchCard
                      key={fullName}
                      img={fakeImg}
                      isFav={isFav(fullName)}
                      onToggleFav={() => toggleFav(fullName)}
                      onClick={() => openDetails(fakeImg)}
                      onPull={(tag) => startPull(fullName, tag)}
                      onDetails={() => openDetails(fakeImg)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {/* details sheet */}
      <Sheet open={!!detailImage} onOpenChange={(o) => { if (!o) setDetailImage(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="font-mono text-base">{detailImage?.name}</SheetTitle>
            <SheetDescription className="text-xs line-clamp-2">{detailImage?.description}</SheetDescription>
          </SheetHeader>

          <div className="px-6 pb-6 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 100px)" }}>
            {detailImage && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <IconStar className="h-3 w-3" stroke={1.75} />
                  {detailImage.starCount}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <IconDownload className="h-3 w-3" stroke={1.75} />
                  {formatCount(detailImage.pullCount)} pulls
                </Badge>
                {detailImage.isOfficial && <Badge variant="default">Official</Badge>}
              </div>
            )}

            {detailImage && (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => startPull(detailImage.name, "latest")}>
                  <IconDownload className="mr-2 h-4 w-4" stroke={1.75} /> Pull
                </Button>
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setRunImage({ name: detailImage.name, tag: "latest" })}>
                  <IconPlayerPlay className="mr-2 h-4 w-4" stroke={1.75} /> Run
                </Button>
              </div>
            )}

            <Separator />

            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
                <IconTag className="h-4 w-4 text-muted-foreground" stroke={1.75} />
                Tags
              </h4>
              {detailLoading ? (
                <PageSkeleton variant="editor" />
              ) : detailTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags found.</p>
              ) : (
                <div className="space-y-1">
                  {detailTags.map((tag) => (
                    <div
                      key={tag.name}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-xs font-medium truncate">{tag.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {tag.os}/{tag.architecture} — {formatBytes(tag.size)}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <Button size="sm" variant="ghost" onClick={() => startPull(detailImage!.name, tag.name)}>
                          <IconDownload className="h-4 w-4" stroke={1.75} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setComposeImage({ name: detailImage!.name, tag: tag.name })}>
                          <IconFileDescription className="h-4 w-4" stroke={1.75} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* pull progress dialog */}
      <Dialog open={!!activePullKey} onOpenChange={(o) => { if (!o) setActivePullKey(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activePullKey && pullTasks[activePullKey]?.status === "pulling" ? (
                <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.75} />
              ) : activePullKey && pullTasks[activePullKey]?.status === "done" ? (
                <IconCheck className="h-4 w-4 text-green-500" stroke={2} />
              ) : (
                <IconAlertTriangle className="h-4 w-4 text-destructive" stroke={2} />
              )}
              Pull {activePullKey}
            </DialogTitle>
            {activePullKey && pullTasks[activePullKey] && (
              <DialogDescription>
                {pullTasks[activePullKey].status === "pulling" && `${pullTasks[activePullKey].layers.length} layers`}
                {pullTasks[activePullKey].status === "done" && "Completed successfully"}
                {pullTasks[activePullKey].status === "error" && pullTasks[activePullKey].error}
              </DialogDescription>
            )}
          </DialogHeader>

          {activePullKey && pullTasks[activePullKey] && (
            <ScrollArea className="h-[350px] rounded-md border bg-muted p-3">
              {pullTasks[activePullKey].layers.map((layer, i) => (
                <div key={layer.id || i} className="flex items-center gap-2 py-1 text-xs font-mono border-b border-border/30 last:border-0">
                  <div className="w-4 shrink-0">
                    {layer.status === "Downloading" ? (
                      <IconLoader2 className="h-3 w-3 animate-spin text-primary" stroke={2} />
                    ) : layer.status === "Download complete" || layer.status === "Pull complete" || layer.status === "Already exists" ? (
                      <IconCheck className="h-3 w-3 text-green-500" stroke={2} />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                    )}
                  </div>
                  <span className="truncate max-w-[120px]">{layer.id?.slice(0, 12) || "..."}</span>
                  <span className="text-muted-foreground shrink-0">{layer.status}</span>
                  {layer.progress && (
                    <span className="text-muted-foreground shrink-0 ml-auto">{layer.progress}</span>
                  )}
                </div>
              ))}
              {pullTasks[activePullKey].layers.length === 0 && pullTasks[activePullKey].status === "pulling" && (
                <p className="text-xs text-muted-foreground text-center py-8">Waiting for layers…</p>
              )}
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActivePullKey(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* run container dialog */}
      <Dialog open={!!runImage} onOpenChange={(o) => { if (!o) { setRunImage(null); setRunName(""); setRunPort(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Container</DialogTitle>
            <DialogDescription className="font-mono">{runImage?.name}:{runImage?.tag}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Container name (optional)</Label>
              <Input
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                placeholder={runImage?.name.split("/").pop() || "my-container"}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRunImage(null); setRunName(""); setRunPort(""); }}>Cancel</Button>
            <Button onClick={doRunContainer} disabled={runCreating}>
              {runCreating ? "Creating…" : "Create & Start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* compose dialog */}
      <Dialog open={!!composeImage} onOpenChange={(o) => { if (!o) { setComposeImage(null); setComposeYaml(""); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Generate Docker Compose</DialogTitle>
            <DialogDescription className="font-mono">{composeImage?.name}:{composeImage?.tag}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Service name</Label>
                <Input
                  value={composeName}
                  onChange={(e) => setComposeName(e.target.value)}
                  placeholder={composeImage?.name.split("/").pop() || "service"}
                />
              </div>
              <div className="space-y-1">
                <Label>Port (optional)</Label>
                <Input
                  value={composePort}
                  onChange={(e) => setComposePort(e.target.value)}
                  placeholder="e.g. 8080"
                  type="number"
                />
              </div>
            </div>
            <Button onClick={() => composeImage && doGenerateCompose(composeImage.name, composeImage.tag)} disabled={composeGenerating}>
              {composeGenerating ? "Generating…" : "Generate"}
            </Button>
            {composeYaml && (
              <div className="space-y-2">
                <ScrollArea className="h-[200px] rounded-md border bg-muted p-3">
                  <pre className="text-xs font-mono whitespace-pre-wrap">{composeYaml}</pre>
                </ScrollArea>
                <Button variant="secondary" onClick={() => setSaveImage({ name: composeImage?.name || "", yaml: composeYaml })}>
                  <IconDeviceFloppy className="mr-2 h-4 w-4" stroke={1.75} /> Save to Workspace
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* save dialog */}
      <Dialog open={!!saveImage} onOpenChange={(o) => { if (!o) setSaveImage(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to Workspace</DialogTitle>
            <DialogDescription>Save the compose file for {saveImage?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Folder name</Label>
            <Input value={saveFolder} onChange={(e) => setSaveFolder(e.target.value)} placeholder="my-stack" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveImage(null)}>Cancel</Button>
            <Button onClick={doSave} disabled={saving || !saveFolder.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── sub-components ── */

function SearchCard({
  img,
  isFav,
  onToggleFav,
  onClick,
  onPull,
  onDetails,
}: {
  img: RegistryImage;
  isFav: boolean;
  onToggleFav: () => void;
  onClick: () => void;
  onPull: (tag: string) => void;
  onDetails: () => void;
}) {
  return (
    <Card className="group relative p-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-sm font-semibold truncate">{img.name}</h3>
            {img.isOfficial && <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">OFFICIAL</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{img.description}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
          className="ml-2 text-muted-foreground hover:text-amber-500"
        >
          {isFav ? <IconStarFilled className="h-4 w-4 text-amber-500" stroke={1.75} /> : <IconStar className="h-4 w-4" stroke={1.75} />}
        </button>
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <IconStar className="h-3 w-3" stroke={1.75} />
          {img.starCount}
        </span>
        <span className="flex items-center gap-1">
          <IconDownload className="h-3 w-3" stroke={1.75} />
          {formatCount(img.pullCount)} pulls
        </span>
      </div>

      <div className="mt-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => onPull("latest")}>
          <IconDownload className="mr-1 h-3 w-3" stroke={1.75} /> Pull
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onDetails}>
          <IconInfoCircle className="mr-1 h-3 w-3" stroke={1.75} /> Details
        </Button>
      </div>
    </Card>
  );
}

function FavoriteCard({
  name,
  onClick,
  onRemove,
}: {
  name: string;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <Card className="p-3 flex items-center justify-between gap-2 hover:border-primary/50 cursor-pointer" onClick={onClick}>
      <div className="flex items-center gap-2 min-w-0">
        <IconStarFilled className="h-4 w-4 text-amber-500 shrink-0" stroke={1.75} />
        <span className="font-mono text-sm truncate">{name}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="text-muted-foreground hover:text-destructive shrink-0"
      >
        <IconX className="h-4 w-4" stroke={1.75} />
      </button>
    </Card>
  );
}
