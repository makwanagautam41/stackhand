import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { IconBell, IconPlus, IconTrash } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { useWorkspaces } from "@/lib/workspace-store";
import type { AlertRule } from "@/lib/types";

export const Route = createFileRoute("/_app/alerts")({
  component: AlertsPage,
  head: () => ({ meta: [{ title: "Alerts · Stackhand" }] }),
});

const CONDS: { id: AlertRule["condition"]; label: string }[] = [
  { id: "restarts>3", label: "Restart count > 3" },
  { id: "cpu>80", label: "CPU > 80%" },
  { id: "mem>80", label: "Memory > 80%" },
  { id: "downtime>5m", label: "Downtime > 5m" },
];

function AlertsPage() {
  const { current, alertsByWs, addAlert, updateAlert, deleteAlert, stacksByWs, pushActivity } =
    useWorkspaces();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [condition, setCondition] = useState<AlertRule["condition"]>("restarts>3");
  const [win, setWin] = useState("5m");

  if (!current) return null;
  const alerts = alertsByWs[current.id] ?? [];
  const containers = (stacksByWs[current.id] ?? []).flatMap((s) => s.containers.map((c) => c.name));

  const create = () => {
    const a: AlertRule = {
      id: crypto.randomUUID(),
      name: name.trim() || "Untitled alert",
      target: target || containers[0] || "any",
      condition,
      window: win,
      enabled: true,
    };
    addAlert(current.id, a);
    pushActivity(current.id, { kind: "create", message: `alert added: ${a.name}` });
    setOpen(false);
    setName("");
    setTarget("");
    toast.success("Alert rule created");
  };

  const trigger = (a: AlertRule) => {
    updateAlert(current.id, a.id, { lastTriggered: "just now" });
    pushActivity(current.id, { kind: "alert", message: `${a.name} fired on ${a.target}` });
    toast.warning(`Alert triggered: ${a.name}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alert rules</h1>
          <p className="text-sm text-muted-foreground">
            Fires notifications when conditions are met (simulated).
          </p>
        </div>
        <Button className="rounded-md" onClick={() => setOpen(true)}>
          <IconPlus className="mr-1.5 h-4 w-4" stroke={2} /> New rule
        </Button>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={IconBell}
          title="No alert rules yet"
          description="Add a rule to be notified when a container misbehaves."
          action={<Button onClick={() => setOpen(true)} className="rounded-md"><IconPlus className="mr-1.5 h-4 w-4" stroke={2} />New rule</Button>}
        />
      ) : (
        <Card className="divide-y">
          {alerts.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="grid h-9 w-9 place-items-center rounded-md border bg-muted/40">
                <IconBell className="h-4 w-4" stroke={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium">{a.name}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {a.target}
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {CONDS.find((c) => c.id === a.condition)?.label}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    window {a.window}
                  </Badge>
                </div>
                {a.lastTriggered && (
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                    last triggered {a.lastTriggered}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" className="rounded-md" onClick={() => trigger(a)}>
                Test
              </Button>
              <Switch
                checked={a.enabled}
                onCheckedChange={(v) => updateAlert(current.id, a.id, { enabled: Boolean(v) })}
              />
              <Button
                size="icon"
                variant="ghost"
                className="rounded-md text-muted-foreground hover:text-destructive"
                onClick={() => deleteAlert(current.id, a.id)}
              >
                <IconTrash className="h-4 w-4" stroke={1.75} />
              </Button>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">New alert rule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-md font-mono" />
            </div>
            <div>
              <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Target container</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="mt-1 rounded-md font-mono"><SelectValue placeholder="any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any container</SelectItem>
                  {containers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Condition</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as AlertRule["condition"])}>
                <SelectTrigger className="mt-1 rounded-md font-mono"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Window</Label>
              <Input value={win} onChange={(e) => setWin(e.target.value)} className="mt-1 rounded-md font-mono" placeholder="5m" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-md">Cancel</Button>
            <Button onClick={create} className="rounded-md">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
