import { useRef, useState, type DragEvent } from "react";
import { IconFolder, IconFolderOpen, IconHome, IconUpload, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEFAULT_ROOT = "/home/gautam-makwana/stackhand";

// Native folder picker: uses <input webkitdirectory> and drag-drop.
// Since this is a browser preview (no filesystem), we derive a plausible
// absolute path from the selected folder name.
export function FolderPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [manual, setManual] = useState(value || DEFAULT_ROOT);

  const commit = (path: string) => {
    setManual(path);
    onChange(path);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const first = files[0] as File & { webkitRelativePath?: string };
    const rel = first.webkitRelativePath ?? "";
    const folderName = rel.split("/")[0] || first.name;
    commit(`/home/user/${folderName}`);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const item = items[0];
      const entry = (
        item as unknown as {
          webkitGetAsEntry?: () => { isDirectory: boolean; name: string } | null;
        }
      ).webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        commit(`/home/user/${entry.name}`);
        return;
      }
    }
    handleFiles(e.dataTransfer.files);
  };

  const useDefault = () => commit(DEFAULT_ROOT);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed bg-muted/30 px-6 py-10 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/60 hover:bg-muted/60",
        )}
      >
        <div
          className={cn(
            "grid h-12 w-12 place-items-center rounded-md border bg-background transition-colors",
            dragOver
              ? "border-primary text-primary"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {dragOver ? (
            <IconFolderOpen className="h-6 w-6" stroke={1.75} />
          ) : (
            <IconUpload className="h-6 w-6" stroke={1.75} />
          )}
        </div>
        <div>
          <div className="text-sm font-medium">
            {dragOver ? "Drop folder to select" : "Drop a folder here or click to browse"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            Uses your OS file picker · folder becomes the workspace root
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          // @ts-expect-error non-standard attributes for directory selection
          webkitdirectory="true"
          directory="true"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          or
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Enter path manually
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconHome className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onBlur={() => commit(manual)}
              placeholder="/home/gautam-makwana/stackhand"
              className="h-9 rounded-md pl-8 font-mono text-sm"
            />
            {manual && (
              <button
                type="button"
                onClick={() => setManual("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Clear"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button type="button" variant="outline" onClick={useDefault}>
            Use default
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <IconFolder className="h-4 w-4 shrink-0 text-primary" stroke={1.75} />
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Selected root
            </div>
            <div className="truncate font-mono text-sm">{value || manual || DEFAULT_ROOT}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
