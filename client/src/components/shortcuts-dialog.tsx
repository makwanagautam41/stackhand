import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: Array<{ group: string; items: Array<{ keys: string[]; desc: string }> }> = [
  {
    group: "Navigation",
    items: [
      { keys: ["⌘", "K"], desc: "Open command palette" },
      { keys: ["G", "D"], desc: "Go to Dashboard" },
      { keys: ["G", "S"], desc: "Go to Stacks" },
      { keys: ["G", "C"], desc: "Go to Containers" },
      { keys: ["G", "Y"], desc: "Go to YAML explorer" },
      { keys: ["G", "A"], desc: "Go to AI assistant" },
    ],
  },
  {
    group: "Actions",
    items: [
      { keys: ["N"], desc: "New stack from template" },
      { keys: ["/"], desc: "Focus search" },
      { keys: ["?"], desc: "Toggle this cheatsheet" },
      { keys: ["Esc"], desc: "Close dialog / panel" },
    ],
  },
  {
    group: "Editor",
    items: [
      { keys: ["⌘", "S"], desc: "Save YAML" },
      { keys: ["⌘", "Enter"], desc: "Validate YAML" },
    ],
  },
];

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (!typing && e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono">Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move around Stackhand without leaving the keyboard.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-3">
          {SHORTCUTS.map((g) => (
            <div key={g.group}>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {g.group}
              </div>
              <ul className="space-y-1.5">
                {g.items.map((s) => (
                  <li key={s.desc} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-foreground/80">{s.desc}</span>
                    <span className="flex gap-1">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
