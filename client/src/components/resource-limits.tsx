import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Container } from "@/lib/types";

export function ResourceLimitsEditor({
  containers,
  onChange,
}: {
  containers: Container[];
  onChange: (updated: Container[]) => void;
}) {
  const [local, setLocal] = useState(containers);

  const update = (id: string, patch: Partial<Container["limits"]>) => {
    setLocal((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, limits: { cpuLimit: 80, memLimit: 512, ...c.limits, ...patch } }
          : c,
      ),
    );
  };

  const apply = () => {
    onChange(local);
    toast.success("Resource limits applied");
  };

  return (
    <div className="space-y-3">
      {local.map((c) => {
        const l = c.limits ?? { cpuLimit: 80, memLimit: 512 };
        return (
          <Card key={c.id} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-mono text-sm font-medium">{c.name}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{c.image}</div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    CPU cap
                  </Label>
                  <span className="font-mono text-xs">{l.cpuLimit}%</span>
                </div>
                <Slider
                  value={[l.cpuLimit]}
                  onValueChange={([v]) => update(c.id, { cpuLimit: v })}
                  min={5}
                  max={100}
                  step={5}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Memory cap
                  </Label>
                  <span className="font-mono text-xs">{l.memLimit} MB</span>
                </div>
                <Slider
                  value={[l.memLimit]}
                  onValueChange={([v]) => update(c.id, { memLimit: v })}
                  min={64}
                  max={4096}
                  step={64}
                />
              </div>
            </div>
          </Card>
        );
      })}
      <div className="flex justify-end">
        <Button onClick={apply} className="rounded-md">
          Apply limits
        </Button>
      </div>
    </div>
  );
}
