import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Bell,
  Bot,
  Database,
  Download,
  FileText,
  FolderTree,
  Gauge,
  Image as ImageIcon,
  LayoutDashboard,
  Layers,
  Plus,
  Settings,
  Container as ContainerIcon,
} from "lucide-react";
import { useWorkspaces } from "@/lib/workspace-store";
import { getWorkspaceIcon } from "@/lib/icon-map";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { workspaces, current, setCurrent, stacksByWs } = useWorkspaces();
  const stacks = current ? (stacksByWs[current.id] ?? []) : [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const go = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go(() => navigate({ to: "/dashboard" }))}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/metrics" }))}>
            <Gauge className="mr-2 h-4 w-4" /> Metrics
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/alerts" }))}>
            <Bell className="mr-2 h-4 w-4" /> Alerts
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/stacks" }))}>
            <Layers className="mr-2 h-4 w-4" /> Stacks
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/containers" }))}>
            <ContainerIcon className="mr-2 h-4 w-4" /> Containers
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/images" }))}>
            <ImageIcon className="mr-2 h-4 w-4" /> Images
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/volumes" }))}>
            <Database className="mr-2 h-4 w-4" /> Volumes
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/registry" }))}>
            <Download className="mr-2 h-4 w-4" /> Registry
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/yaml" }))}>
            <FolderTree className="mr-2 h-4 w-4" /> YAML Explorer
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/env" }))}>
            <FileText className="mr-2 h-4 w-4" /> Env files
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/images" }))}>
            <ImageIcon className="mr-2 h-4 w-4" /> Images
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/setup" }))}>
            <Settings className="mr-2 h-4 w-4" /> Setup
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/ai" }))}>
            <Bot className="mr-2 h-4 w-4" /> AI Assistant
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/settings" }))}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </CommandItem>
        </CommandGroup>
        {stacks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Stacks">
              {stacks.map((s) => (
                <CommandItem
                  key={s.id}
                  onSelect={() =>
                    go(() =>
                      navigate({
                        to: "/stacks/$stackId",
                        params: { stackId: s.id },
                      }),
                    )
                  }
                >
                  <Layers className="mr-2 h-4 w-4" /> {s.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Workspaces">
          {workspaces.map((w) => {
            const Icon = getWorkspaceIcon(w.icon);
            return (
              <CommandItem key={w.id} onSelect={() => go(() => setCurrent(w.id))}>
                <span
                  className="mr-2 grid h-4 w-4 place-items-center rounded text-white"
                  style={{ backgroundColor: w.color }}
                >
                  <Icon className="h-3 w-3" />
                </span>
                Switch to {w.name}
              </CommandItem>
            );
          })}
          <CommandItem
            onSelect={() => go(() => navigate({ to: "/onboarding", search: { add: true } }))}
          >
            <Plus className="mr-2 h-4 w-4" /> New workspace
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
