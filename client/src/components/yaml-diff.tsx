import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Line = { type: "same" | "add" | "remove"; text: string; oldNo?: number; newNo?: number };

function diff(a: string, b: string): Line[] {
  const A = a.split("\n");
  const B = b.split("\n");
  // simple LCS diff
  const n = A.length, m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: Line[] = [];
  let i = 0, j = 0, oldNo = 1, newNo = 1;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ type: "same", text: A[i], oldNo: oldNo++, newNo: newNo++ });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "remove", text: A[i], oldNo: oldNo++ });
      i++;
    } else {
      out.push({ type: "add", text: B[j], newNo: newNo++ });
      j++;
    }
  }
  while (i < n) out.push({ type: "remove", text: A[i++], oldNo: oldNo++ });
  while (j < m) out.push({ type: "add", text: B[j++], newNo: newNo++ });
  return out;
}

export function YamlDiff({ oldValue, newValue }: { oldValue: string; newValue: string }) {
  const lines = useMemo(() => diff(oldValue, newValue), [oldValue, newValue]);
  const added = lines.filter((l) => l.type === "add").length;
  const removed = lines.filter((l) => l.type === "remove").length;

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          pending changes
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-emerald-500">+{added}</span>
          <span className="text-destructive">-{removed}</span>
        </div>
      </div>
      <pre className="max-h-[520px] overflow-auto p-0 font-mono text-[12px] leading-5">
        {lines.map((l, idx) => (
          <div
            key={idx}
            className={cn(
              "flex px-0",
              l.type === "add" && "bg-emerald-500/10",
              l.type === "remove" && "bg-destructive/10",
            )}
          >
            <span className="w-10 shrink-0 select-none border-r px-2 text-right text-muted-foreground/60">
              {l.oldNo ?? ""}
            </span>
            <span className="w-10 shrink-0 select-none border-r px-2 text-right text-muted-foreground/60">
              {l.newNo ?? ""}
            </span>
            <span className="w-6 shrink-0 select-none text-center text-muted-foreground">
              {l.type === "add" ? "+" : l.type === "remove" ? "−" : " "}
            </span>
            <span className="whitespace-pre">{l.text || " "}</span>
          </div>
        ))}
        {lines.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">Identical.</div>
        )}
      </pre>
    </div>
  );
}
