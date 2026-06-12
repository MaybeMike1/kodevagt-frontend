import type { ReactNode } from "react";
import { BookText, GitBranch, GitFork, Globe, Lock, Star, Tag } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { FileContentViewer } from "@/components/layout/FileContentViewer";
import { formatCount } from "@/lib/format";
import { languageColor } from "@/lib/language";
import type { FileContent, RepoInfo } from "@/lib/types";
import { RepoStats } from "./RepoStats";

type RepoOverviewProps = {
  repo: RepoInfo;
  branchCount: number | null;
  commitCount: number | null;
  readme: FileContent | null;
  statsLoading?: boolean;
  statsError?: string | null;
  readmeLoading?: boolean;
};

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof GitBranch;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-sm font-medium">{children}</span>
    </div>
  );
}

export function RepoOverview({
  repo,
  branchCount,
  commitCount,
  readme,
  statsLoading,
  statsError,
  readmeLoading,
}: RepoOverviewProps) {
  return (
    <div className="space-y-6">
      <RepoStats
        branchCount={branchCount}
        commitCount={commitCount}
        loading={statsLoading}
        error={statsError}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 order-2 lg:order-1">
          {readmeLoading ? (
            <div className="surface-card space-y-3 rounded-xl p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : readme ? (
            <div className="surface-card overflow-hidden rounded-xl">
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                <BookText className="size-4 text-primary" />
                <span className="font-mono text-xs font-medium">{readme.name}</span>
                <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Readme
                </span>
              </div>
              <ScrollArea className="max-h-[32rem]">
                <FileContentViewer path={readme.path} content={readme.text} size={readme.size} />
              </ScrollArea>
            </div>
          ) : (
            <div className="surface-card flex flex-col items-center justify-center rounded-xl px-6 py-12 text-center">
              <BookText className="mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No README</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This repository has no README in its root.
              </p>
            </div>
          )}
        </div>

        <div className="order-1 lg:order-2">
          <div className="surface-card rounded-xl p-5">
            <h3 className="mb-1 text-sm font-semibold">About</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              {repo.description ?? "No description provided."}
            </p>
            <div className="divide-y divide-border">
              <DetailRow icon={repo.private ? Lock : Globe} label="Visibility">
                {repo.private ? "Private" : "Public"}
              </DetailRow>
              <DetailRow icon={Tag} label="Language">
                {repo.language ? (
                  <>
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: languageColor(repo.language) }}
                    />
                    {repo.language}
                  </>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow icon={GitBranch} label="Default branch">
                <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {repo.defaultBranch}
                </code>
              </DetailRow>
              <DetailRow icon={Star} label="Stars">
                <span className="tabular-nums">{formatCount(repo.stargazersCount)}</span>
              </DetailRow>
              {repo.forksCount != null && (
                <DetailRow icon={GitFork} label="Forks">
                  <span className="tabular-nums">{formatCount(repo.forksCount)}</span>
                </DetailRow>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
