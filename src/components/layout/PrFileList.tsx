import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/format";
import type { PullRequestFileItem, PullRequestFileStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PrDiffViewer } from "./PrDiffViewer";

const statusStyles: Record<PullRequestFileStatus, string> = {
  added: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  modified: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  removed: "border-red-500/30 bg-red-500/15 text-red-400",
  renamed: "border-blue-500/30 bg-blue-500/15 text-blue-400",
  copied: "border-blue-500/30 bg-blue-500/15 text-blue-400",
  changed: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  unchanged: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

/** Request to reveal a specific file (and optional line) in the diff list. */
export type PrFileNavTarget = {
  file: string;
  line?: number;
  /** Bumped on each navigation so repeat clicks re-trigger scroll/highlight. */
  nonce: number;
};

type PrFileListProps = {
  files: PullRequestFileItem[];
  /** When set, the matching file is expanded, scrolled into view, and highlighted. */
  navTarget?: PrFileNavTarget | null;
};

export function PrFileList({ files, navTarget }: PrFileListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!navTarget) return;
    if (!files.some((file) => file.filename === navTarget.file)) return;

    setExpanded((prev) => {
      if (prev.has(navTarget.file)) return prev;
      const next = new Set(prev);
      next.add(navTarget.file);
      return next;
    });

    // Wait for the expanded diff to render before scrolling.
    const raf = window.requestAnimationFrame(() => {
      const escaped =
        typeof CSS !== "undefined" && CSS.escape
          ? CSS.escape(navTarget.file)
          : navTarget.file.replace(/"/g, '\\"');
      const row = containerRef.current?.querySelector<HTMLElement>(
        `[data-file-path="${escaped}"]`,
      );
      // When a line is targeted, PrDiffViewer handles the precise scroll; only
      // scroll to the file header when there is no line to focus.
      if (row && navTarget.line == null) {
        row.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [navTarget, files]);

  const toggle = (filename: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  if (files.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No file changes in this pull request.
      </p>
    );
  }

  return (
    <div ref={containerRef} className="surface-card divide-y divide-border overflow-hidden rounded-xl">
      {files.map((file) => {
        const isOpen = expanded.has(file.filename);
        const isTarget = navTarget?.file === file.filename;
        const displayName =
          file.status === "renamed" && file.previousFilename
            ? `${file.previousFilename} → ${file.filename}`
            : file.filename;

        return (
          <div key={file.filename} data-file-path={file.filename} className="scroll-mt-20">
            <button
              type="button"
              onClick={() => toggle(file.filename)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40",
                isOpen && "bg-muted/30",
              )}
            >
              <ChevronRight
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-90",
                )}
              />
              <Badge variant="outline" className={cn("shrink-0 capitalize", statusStyles[file.status])}>
                {file.status}
              </Badge>
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{displayName}</span>
              <span className="shrink-0 font-mono text-xs font-medium text-success">
                +{formatCount(file.additions)}
              </span>
              <span className="shrink-0 font-mono text-xs font-medium text-destructive">
                −{formatCount(file.deletions)}
              </span>
            </button>
            {isOpen && file.patch && (
              <PrDiffViewer
                patch={file.patch}
                highlightLine={isTarget ? navTarget?.line : undefined}
                highlightKey={isTarget ? navTarget?.nonce : undefined}
              />
            )}
            {isOpen && !file.patch && (
              <p className="border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                Diff too large to display inline.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
