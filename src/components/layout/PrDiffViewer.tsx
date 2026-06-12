import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type PrDiffViewerProps = {
  patch: string;
  className?: string;
  /** New-file line number to scroll to and briefly highlight. */
  highlightLine?: number;
  /** Bumping this re-triggers the scroll/highlight even for the same line. */
  highlightKey?: number;
};

type DiffLineKind = "add" | "del" | "hunk" | "meta" | "context";

type DiffLine = {
  kind: DiffLineKind;
  text: string;
  oldNo: number | null;
  newNo: number | null;
};

function parsePatch(patch: string): DiffLine[] {
  const lines = patch.split("\n");
  const result: DiffLine[] = [];
  let oldNo = 0;
  let newNo = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (match) {
        oldNo = parseInt(match[1], 10);
        newNo = parseInt(match[2], 10);
      }
      result.push({ kind: "hunk", text: line, oldNo: null, newNo: null });
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ")) {
      result.push({ kind: "meta", text: line, oldNo: null, newNo: null });
      continue;
    }
    if (line.startsWith("+")) {
      result.push({ kind: "add", text: line.slice(1), oldNo: null, newNo: newNo++ });
      continue;
    }
    if (line.startsWith("-")) {
      result.push({ kind: "del", text: line.slice(1), oldNo: oldNo++, newNo: null });
      continue;
    }
    result.push({ kind: "context", text: line.startsWith(" ") ? line.slice(1) : line, oldNo: oldNo++, newNo: newNo++ });
  }

  // Trim a single trailing empty line produced by split.
  if (result.length && result[result.length - 1].text === "" && result[result.length - 1].kind === "context") {
    result.pop();
  }
  return result;
}

const lineClass: Record<DiffLineKind, string> = {
  add: "bg-success/10",
  del: "bg-destructive/10",
  hunk: "bg-primary/[0.07] text-primary/80 select-none",
  meta: "text-muted-foreground/60 select-none",
  context: "",
};

const markerClass: Record<DiffLineKind, string> = {
  add: "text-success",
  del: "text-destructive",
  hunk: "text-primary/60",
  meta: "text-transparent",
  context: "text-muted-foreground/40",
};

const marker: Record<DiffLineKind, string> = {
  add: "+",
  del: "−",
  hunk: "",
  meta: "",
  context: "",
};

export function PrDiffViewer({ patch, className, highlightLine, highlightKey }: PrDiffViewerProps) {
  const lines = useMemo(() => parsePatch(patch), [patch]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [flashLine, setFlashLine] = useState<number | null>(null);

  useEffect(() => {
    if (highlightLine == null) return;
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-new-line="${highlightLine}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setFlashLine(highlightLine);
    const timer = window.setTimeout(() => setFlashLine(null), 2200);
    return () => window.clearTimeout(timer);
  }, [highlightLine, highlightKey]);

  if (!patch.trim()) {
    return (
      <p className={cn("border-t border-border px-4 py-3 text-xs text-muted-foreground", className)}>
        No diff available for this file.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-x-auto border-t border-border bg-background/40", className)}
    >
      <table className="w-full border-collapse font-mono text-xs leading-relaxed">
        <tbody>
          {lines.map((line, i) => (
            <tr
              key={i}
              data-new-line={line.newNo ?? undefined}
              className={cn(
                "group",
                lineClass[line.kind],
                flashLine != null &&
                  line.newNo === flashLine &&
                  "bg-primary/25 ring-1 ring-inset ring-primary/40",
              )}
            >
              <td className="w-10 select-none border-r border-border/50 px-2 text-right align-top text-[11px] text-muted-foreground/40 tabular-nums">
                {line.oldNo ?? ""}
              </td>
              <td className="w-10 select-none border-r border-border/50 px-2 text-right align-top text-[11px] text-muted-foreground/40 tabular-nums">
                {line.newNo ?? ""}
              </td>
              <td className={cn("w-4 select-none pl-2 text-center align-top", markerClass[line.kind])}>
                {marker[line.kind]}
              </td>
              <td className="whitespace-pre-wrap break-all py-px pr-3 pl-1 align-top text-foreground/90">
                {line.text || "\u00A0"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
