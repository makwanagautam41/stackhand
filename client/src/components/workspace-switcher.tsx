import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaces } from "@/lib/workspace-store";
import { getWorkspaceIcon } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const { workspaces, current, setCurrent } = useWorkspaces();
  const navigate = useNavigate();
  if (!current) return null;
  const Icon = getWorkspaceIcon(current.icon);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 gap-2 pr-2 font-medium",
            compact ? "w-full justify-between" : "w-[220px] justify-between",
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <span
              className="grid h-6 w-6 place-items-center rounded-md text-white"
              style={{ backgroundColor: current.color }}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">{current.name}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px]">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((w) => {
          const WIcon = getWorkspaceIcon(w.icon);
          return (
            <DropdownMenuItem
              key={w.id}
              onClick={() => setCurrent(w.id)}
              className="flex items-center gap-2"
            >
              <span
                className="grid h-6 w-6 place-items-center rounded-md text-white"
                style={{ backgroundColor: w.color }}
              >
                <WIcon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === current.id && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/onboarding", search: { add: true } })}>
          <Plus className="mr-2 h-4 w-4" /> New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
