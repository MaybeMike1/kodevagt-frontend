import { GitBranch, GitCommit } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

type RepoStatsProps = {
  branchCount: number | null;
  commitCount: number | null;
  loading?: boolean;
  error?: string | null;
};

function StatBlock({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof GitBranch;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="surface-card hover-lift group relative flex flex-1 items-center gap-3.5 overflow-hidden rounded-xl px-4 py-3.5 min-w-[160px]">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
          tint,
        )}
      >
        <Icon className="size-[18px]" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight">{value}</p>
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function RepoStats({ branchCount, commitCount, loading, error }: RepoStatsProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load repository stats</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-[74px] min-w-[160px] flex-1 rounded-xl" />
        <Skeleton className="h-[74px] min-w-[160px] flex-1 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <StatBlock
        icon={GitBranch}
        label={branchCount === 1 ? "Branch" : "Branches"}
        value={formatCount(branchCount ?? 0)}
        tint="bg-primary/10 text-primary ring-primary/20"
      />
      <StatBlock
        icon={GitCommit}
        label={commitCount === 1 ? "Commit" : "Commits"}
        value={formatCount(commitCount ?? 0)}
        tint="bg-success/10 text-success ring-success/20"
      />
    </div>
  );
}
