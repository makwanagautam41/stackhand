import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { IconCode, IconCopy, IconDownload, IconPlus, IconTrash } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { useWorkspaces } from "@/lib/workspace-store";
import type { Snippet } from "@/lib/types";

export const Route = createFileRoute("/_app/snippets")({
  component: SnippetsPage,
  head: () => ({ meta: [{ title: "Snippets · Stackhand" }] }),
});

function SnippetsPage() {
  const { current, snippetsByWs, addSnippet, deleteSnippet } = useWorkspaces();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [yaml, setYaml] = useState("");
  const [q, setQ] = useState("");

  if (!current) return null;
  const snippets = (snippetsByWs[current.id] ?? []).filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.tags.join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  const create = () => {
    const s: Snippet = {
      id: crypto.randomUUID(),
      name: name.trim() || "Untitled",
      description: desc.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      yaml,
      createdAt: new Date().toISOString(),
    };
    addSnippet(current.id, s);
    setOpen(false);
    setName(""); setDesc(""); setTags(""); setYaml("");
    toast.success("Snippet saved");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Snippets</h1>
          <p className="text-sm text-muted-foreground">Reusable compose fragments.</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search…"
            className="w-52 rounded-md font-mono text-xs"
          />
          <Button className="rounded-md" onClick={() => setOpen(true)}>
            <IconPlus className="mr-1.5 h-4 w-4" stroke={2} /> New
          </Button>
        </div>
      </div>

      {snippets.length === 0 ? (
        <EmptyState
          icon={IconCode}
          title="No snippets"
          description="Save reusable compose fragments here."
          action={<Button onClick={() => setOpen(true)} className="rounded-md"><IconPlus className="mr-1.5 h-4 w-4" stroke={2} />New snippet</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {snippets.map((s) => (
            <Card key={s.id} className="flex flex-col overflow-hidden">
              <div className="flex items-start justify-between border-b p-3">
                <div className="min-w-0">
                  <div className="font-mono text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-md"
                    onClick={() => {
                      navigator.clipboard.writeText(s.yaml);
                      toast.success("Copied");
                    }}
                  >
                    <IconCopy className="h-3.5 w-3.5" stroke={1.75} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-md"
                    title="Download .yml"
                    onClick={() => {
                      const blob = new Blob([s.yaml], { type: "text/yaml" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${s.name.replace(/\s+/g, "-").toLowerCase()}.yml`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Downloaded");
                    }}
                  >
                    <IconDownload className="h-3.5 w-3.5" stroke={1.75} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-md hover:text-destructive"
                    onClick={() => deleteSnippet(current.id, s.id)}
                  >
                    <IconTrash className="h-3.5 w-3.5" stroke={1.75} />
                  </Button>
                </div>
              </div>
              <pre className="max-h-40 overflow-auto bg-muted/40 p-3 font-mono text-[11px]">
                {s.yaml}
              </pre>
              <div className="flex flex-wrap gap-1 border-t p-2">
                {s.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="font-mono text-[10px]">#{t}</Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-mono">New snippet</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-md font-mono" />
            </div>
            <div>
              <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Description</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 rounded-md" />
            </div>
            <div>
              <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Tags (comma sep)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 rounded-md font-mono" placeholder="health, policy" />
            </div>
            <div>
              <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">YAML</Label>
              <Textarea rows={10} value={yaml} onChange={(e) => setYaml(e.target.value)} className="mt-1 rounded-md font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-md">Cancel</Button>
            <Button onClick={create} className="rounded-md">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
