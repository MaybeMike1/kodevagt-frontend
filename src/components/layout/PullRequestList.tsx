import type { ReactNode } from "react";
import { ArrowRight, GitPullRequest } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PrStateBadge } from "@/components/PrStateBadge";
import { formatRelativeTime } from "@/lib/format";
import type { PullRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

type PullRequestListProps = {
  pullRequests: PullRequest[];
  loading?: boolean;
  error?: string | null;
  selectedNumber?: number | null;
  onSelect?: (number: number) => void;
};

function BranchChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-[160px] items-center truncate rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

export function PullRequestList({
  pullRequests,
  loading,
  error,
  selectedNumber,
  onSelect,
}: PullRequestListProps) {
  if (loading) {
    return (
      <div className="surface-card divide-y divide-border overflow-hidden rounded-xl">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3.5">
            <Skeleton className="mt-0.5 size-4 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load pull requests</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (pullRequests.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center justify-center rounded-xl px-6 py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted/60">
          <GitPullRequest className="size-6 text-muted-foreground/70" />
        </div>
        <p className="text-sm font-semibold">No pull requests</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          This repository has no open or recently updated pull requests.
        </p>
      </div>
    );
  }

  return (
    <ul className="surface-card divide-y divide-border overflow-hidden rounded-xl">
      {pullRequests.map((pr) => (
        <li key={pr.number}>
          <button
            type="button"
            onClick={() => onSelect?.(pr.number)}
            className={cn(
              "group flex w-full items-start gap-3.5 px-4 py-3.5 text-left transition-colors",
              selectedNumber === pr.number ? "bg-primary/[0.07]" : "hover:bg-muted/40",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <PrStateBadge state={pr.state} draft={pr.draft} />
                <span className="font-mono text-xs text-muted-foreground">#{pr.number}</span>
              </div>
              <p className="mt-1.5 truncate text-sm font-medium transition-colors group-hover:text-primary">
                {pr.title}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  {pr.authorAvatarUrl && (
                    <Avatar size="sm" className="size-4">
                      <AvatarImage src={pr.authorAvatarUrl} alt={pr.author} />
                      <AvatarFallback>{pr.author.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <span className="font-medium text-foreground/80">{pr.author}</span>
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1">
                  <BranchChip>{pr.headRef}</BranchChip>
                  <ArrowRight className="size-3 text-muted-foreground/50" />
                  <BranchChip>{pr.baseRef}</BranchChip>
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span>updated {formatRelativeTime(pr.updatedAt)}</span>
              </div>
            </div>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground/0 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}
