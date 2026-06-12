import { useCallback, useEffect, useState } from "react";
import { Database, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getIndexStatus, startRepoIndex } from "@/lib/review";
import type { IndexStatus } from "@/lib/types";

type RepoIndexControlsProps = {
  owner: string;
  repo: string;
  onStatusChange?: (status: IndexStatus | null) => void;
};

export function RepoIndexControls({ owner, repo, onStatusChange }: RepoIndexControlsProps) {
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const meta = await getIndexStatus(owner, repo);
      setStatus(meta);
      onStatusChange?.(meta);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load index status");
    }
  }, [owner, repo, onStatusChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (status?.status !== "indexing") return;
    const id = setInterval(() => void refresh(), 2000);
    return () => clearInterval(id);
  }, [status?.status, refresh]);

  async function handleIndex() {
    setLoading(true);
    setError(null);
    try {
      const meta = await startRepoIndex(owner, repo);
      setStatus(meta);
      onStatusChange?.(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start indexing");
    } finally {
      setLoading(false);
    }
  }

  const badgeLabel =
    status?.status === "ready"
      ? `Indexed · ${status.chunkCount} chunks`
      : status?.status === "indexing"
        ? `Indexing… ${status.fileCount} files`
        : status?.status === "failed"
          ? "Index failed"
          : "Not indexed";

  const isIndexing = loading || status?.status === "indexing";
  const dotClass =
    status?.status === "ready"
      ? "bg-success"
      : status?.status === "failed"
        ? "bg-destructive"
        : status?.status === "indexing"
          ? "bg-warning"
          : "bg-muted-foreground/50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "inline-flex h-7 items-center gap-2 rounded-full border border-border bg-card/60 pr-3 pl-2.5 text-xs font-medium",
          status?.status === "failed" && "border-destructive/30 text-destructive",
        )}
      >
        <Database className="size-3.5 text-muted-foreground" />
        <span className="relative flex size-1.5">
          {status?.status === "indexing" && (
            <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", dotClass)} />
          )}
          <span className={cn("relative inline-flex size-1.5 rounded-full", dotClass)} />
        </span>
        {badgeLabel}
      </span>
      <Button
        type="button"
        size="sm"
        variant={status?.status === "ready" ? "outline" : "default"}
        disabled={isIndexing}
        onClick={() => void handleIndex()}
      >
        {isIndexing ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Indexing…
          </>
        ) : (
          <>
            <Sparkles className="size-3.5" />
            {status?.status === "ready" ? "Re-index" : "Index for AI review"}
          </>
        )}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
      {status?.status === "failed" && status.error && (
        <p className="w-full text-xs text-destructive">{status.error}</p>
      )}
      {status?.status === "ready" && status.chunkCount === 0 && (
        <p className="w-full text-xs text-destructive">
          Index completed with no chunks. Start Ollama and pull the embedding model, then try again.
        </p>
      )}
    </div>
  );
}
