import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  IconServer,
  IconDatabase,
  IconBolt,
  IconBrandWordpress,
  IconRoute,
  IconLeaf,
  IconSearch,
  IconTemplate,
  IconPlus,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { useWorkspaces } from "@/lib/workspace-store";
import type { StackTemplate } from "@/lib/types";

export const Route = createFileRoute("/_app/templates")({
  component: TemplatesPage,
  head: () => ({ meta: [{ title: "Templates · Stackhand" }] }),
});

const ICONS: Record<string, React.ComponentType<{ className?: string; stroke?: number }>> = {
  IconServer,
  IconDatabase,
  IconBolt,
  IconBrandWordpress,
  IconRoute,
  IconLeaf,
};

function TemplatesPage() {
  const { current, addStack } = useWorkspaces();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<StackTemplate[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [picked, setPicked] = useState<StackTemplate | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    api.listTemplates().then((data) => {
      const mapped: StackTemplate[] = (data ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? "",
        icon: t.icon ?? "IconTemplate",
        color: t.color ?? "#6366f1",
        tags: t.tags ?? [],
        yaml: t.yaml ?? "",
        category: t.category ?? "Other",
      }));
      setTemplates(mapped);
    });
  }, []);

  const cats = ["All", ...Array.from(new Set(templates.map((t) => t.category)))];
  const filtered = templates.filter(
    (t) =>
      (cat === "All" || t.category === cat) &&
      (t.name.toLowerCase().includes(q.toLowerCase()) ||
        t.tags.join(" ").toLowerCase().includes(q.toLowerCase())),
  );

  const create = async () => {
    if (!current || !picked) return;
    const stackName = name.trim() || picked.name.toLowerCase();
    // Substitute {{name}} placeholder in the template YAML
    const finalYaml = picked.yaml.replace(/\{\{name\}\}/g, stackName);
    try {
      const created = await api.createStack(current.id, {
        name: stackName,
        yaml: finalYaml,
        folderName: stackName.replace(/[^a-z0-9-]/g, '-'),
      });
      addStack(current.id, { ...created, workspaceId: current.id });
      toast.success(`Stack "${stackName}" created from ${picked.name}`);
      setPicked(null);
      setName("");
      navigate({ to: "/stacks/$stackId", params: { stackId: created.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create stack");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="text-sm text-muted-foreground">
          Curated starter stacks — one click to add to this workspace.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" stroke={1.75} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates…"
            className="pl-9 rounded-md font-mono text-sm"
          />
        </div>
        <div className="flex gap-1">
          {cats.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={cat === c ? "default" : "outline"}
              onClick={() => setCat(c)}
              className="rounded-md font-mono text-xs"
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={IconTemplate} title="No templates match" description="Try clearing filters." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const Icon = ICONS[t.icon] ?? IconTemplate;
            return (
              <Card
                key={t.id}
                className="group flex flex-col overflow-hidden p-4 transition-colors hover:border-foreground/30"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-md text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    <Icon className="h-5 w-5" stroke={1.75} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{t.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {t.category}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {t.description}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-mono text-[10px]">
                      #{tag}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-md"
                    onClick={() => setPicked(t)}
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-md"
                    onClick={() => {
                      setPicked(t);
                      setName(t.name.toLowerCase());
                    }}
                  >
                    <IconPlus className="mr-1.5 h-3.5 w-3.5" stroke={2} /> Use template
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!picked} onOpenChange={(v) => !v && setPicked(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono">Create from {picked?.name}</DialogTitle>
            <DialogDescription>{picked?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="stack name"
              className="rounded-md font-mono"
            />
            <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-[12px]">
              {picked?.yaml}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPicked(null)} className="rounded-md">
              Cancel
            </Button>
            <Button onClick={create} className="rounded-md">
              Create stack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
