import { IconKeyboard, IconSearch } from "@tabler/icons-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { ActivityDrawer } from "@/components/activity-drawer";
import { useState } from "react";

export function TopBar() {
  const [openPalette, setOpenPalette] = useState(false);

  const fireShortcut = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur">
        <SidebarTrigger />
        <Button
          variant="outline"
          className="ml-auto h-9 gap-2 rounded-md px-3 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:ml-4 md:mr-auto md:w-[320px] md:justify-start"
          onClick={() => setOpenPalette(true)}
        >
          <IconSearch className="h-4 w-4" stroke={1.75} />
          <span className="hidden md:inline">Search stacks, files, actions…</span>
          <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] md:inline">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-md"
          onClick={fireShortcut}
          aria-label="Shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <IconKeyboard className="h-4 w-4" stroke={1.75} />
        </Button>
        <ActivityDrawer />
        <ThemeToggle />
      </header>
      <CommandPalette open={openPalette} onOpenChange={setOpenPalette} />
    </>
  );
}
