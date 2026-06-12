import { GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PullRequestState } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const stateStyles: Record<PullRequestState, string> = {
  open: "border-emerald-500/30 bg-emerald-500/12 text-emerald-500 dark:text-emerald-400",
  closed: "border-red-500/30 bg-red-500/12 text-red-500 dark:text-red-400",
  merged: "border-violet-500/30 bg-violet-500/12 text-violet-500 dark:text-violet-400",
};

const draftStyle = "border-muted-foreground/30 bg-muted text-muted-foreground";

const stateLabels: Record<PullRequestState, string> = {
  open: "Open",
  closed: "Closed",
  merged: "Merged",
};

type PrStateBadgeProps = {
  state: PullRequestState;
  draft?: boolean;
  className?: string;
};

export function PrStateBadge({ state, draft, className }: PrStateBadgeProps) {
  const isDraft = draft && state === "open";
  const Icon = isDraft
    ? GitPullRequestDraft
    : state === "merged"
      ? GitMerge
      : state === "closed"
        ? GitPullRequestClosed
        : GitPullRequest;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        isDraft ? draftStyle : stateStyles[state],
        className,
      )}
    >
      <Icon className="size-3" />
      {isDraft ? "Draft" : stateLabels[state]}
    </Badge>
  );
}
