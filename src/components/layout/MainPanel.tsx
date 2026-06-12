import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ExternalLink,
  GitBranch,
  GitFork,
  GitPullRequest,
  Globe,
  Lock,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePeriodicSync } from "@/hooks/usePeriodicSync";
import { formatCount } from "@/lib/format";
import { languageColor } from "@/lib/language";
import { openExternal } from "@/lib/open";
import { fetchPullRequests, fetchRepoOverviewData, splitRepoFullName } from "@/lib/github";
import { BACKGROUND_SYNC_INTERVAL_MS } from "@/lib/sync";
import type { ContentItem, FileContent, PullRequest, RepoInfo } from "@/lib/types";
import { PullRequestDetail } from "./PullRequestDetail";
import { PullRequestList } from "./PullRequestList";
import { RepoIndexControls } from "./RepoIndexControls";
import { RepoOverview } from "./RepoOverview";
import { RepoSourceCode } from "./RepoSourceCode";
import type { IndexStatus } from "@/lib/types";

type MainPanelProps = {
  repo: RepoInfo | null;
  loading?: boolean;
  onBack?: () => void;
};

export function MainPanel({ repo, loading, onBack }: MainPanelProps) {
  const [tab, setTab] = useState("overview");
  const [selectedPrNumber, setSelectedPrNumber] = useState<number | null>(null);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [prsLoading, setPrsLoading] = useState(false);
  const [prsError, setPrsError] = useState<string | null>(null);
  const [branchCount, setBranchCount] = useState<number | null>(null);
  const [commitCount, setCommitCount] = useState<number | null>(null);
  const [rootContents, setRootContents] = useState<ContentItem[]>([]);
  const [readme, setReadme] = useState<FileContent | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);

  useEffect(() => {
    setTab("overview");
    setSelectedPrNumber(null);
    setPullRequests([]);
    setPrsError(null);
    setBranchCount(null);
    setCommitCount(null);
    setRootContents([]);
    setReadme(null);
    setOverviewError(null);
    setIndexStatus(null);
  }, [repo?.fullName]);

  const repoFullName = repo?.fullName;
  const repoDefaultBranch = repo?.defaultBranch;

  const loadOverview = useCallback(
    async (background = false) => {
      if (!repoFullName || !repoDefaultBranch) return;

      const [owner, name] = splitRepoFullName(repoFullName);
      if (!background) {
        setOverviewLoading(true);
        setOverviewError(null);
      }

      try {
        const data = await fetchRepoOverviewData(owner, name, repoDefaultBranch);
        setBranchCount(data.branchCount);
        setCommitCount(data.commitCount);
        setRootContents(data.rootContents);
        setReadme(data.readme);
      } catch (err) {
        if (!background) {
          setBranchCount(null);
          setCommitCount(null);
          setRootContents([]);
          setReadme(null);
          setOverviewError(
            err instanceof Error ? err.message : "Failed to load repository overview",
          );
        }
      } finally {
        if (!background) setOverviewLoading(false);
      }
    },
    [repoFullName, repoDefaultBranch],
  );

  const loadPullRequests = useCallback(
    async (background = false) => {
      if (!repoFullName) return;

      const [owner, name] = splitRepoFullName(repoFullName);
      if (!background) {
        setPrsLoading(true);
        setPrsError(null);
      }

      try {
        const list = await fetchPullRequests(owner, name);
        setPullRequests(list);
      } catch (err) {
        if (!background) {
          setPullRequests([]);
          setPrsError(err instanceof Error ? err.message : "Failed to load pull requests");
        }
      } finally {
        if (!background) setPrsLoading(false);
      }
    },
    [repoFullName],
  );

  useEffect(() => {
    if (!repoFullName) return;
    void loadOverview(false);
  }, [repoFullName, loadOverview]);

  useEffect(() => {
    if (!repoFullName || tab !== "pulls") return;
    void loadPullRequests(false);
  }, [repoFullName, tab, loadPullRequests]);

  usePeriodicSync(
    () => loadOverview(true),
    BACKGROUND_SYNC_INTERVAL_MS,
    repoFullName !== undefined,
  );

  usePeriodicSync(
    () => loadPullRequests(true),
    BACKGROUND_SYNC_INTERVAL_MS,
    repoFullName !== undefined && tab === "pulls" && selectedPrNumber === null,
  );

  const handlePrSelect = (number: number) => {
    setSelectedPrNumber(number);
  };

  const handlePrBack = () => {
    setSelectedPrNumber(null);
  };

  if (!repo && !loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-inset ring-primary/15">
          <GitPullRequest className="size-7 text-primary" />
          <span className="absolute inset-0 -z-10 rounded-2xl bg-primary/20 blur-xl" />
        </div>
        <p className="text-base font-semibold tracking-tight">Select a repository</p>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Choose a repo from the sidebar to explore its source, pull requests, and AI reviews.
        </p>
      </div>
    );
  }

  if (loading || !repo) {
    return (
      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="space-y-3">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-[74px] flex-1 rounded-xl" />
          <Skeleton className="h-[74px] flex-1 rounded-xl" />
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  const [owner, repoName] = splitRepoFullName(repo.fullName);
  const selectedPr = selectedPrNumber
    ? pullRequests.find((pr) => pr.number === selectedPrNumber)
    : null;

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <div className="border-b border-border/80 bg-card/30 px-6 pt-4 pb-0 backdrop-blur-sm">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2 text-muted-foreground"
            onClick={onBack}
            aria-label="Back to repositories"
          >
            <ChevronLeft className="size-4" />
            Repositories
          </Button>
        )}
        {tab === "pulls" && selectedPrNumber !== null && (
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <button
              type="button"
              className="font-mono transition-colors hover:text-foreground"
              onClick={() => {
                setTab("pulls");
                setSelectedPrNumber(null);
              }}
            >
              {repo.fullName}
            </button>
            <span className="text-muted-foreground/50">/</span>
            <button
              type="button"
              className="transition-colors hover:text-foreground"
              onClick={handlePrBack}
            >
              Pull requests
            </button>
            <span className="text-muted-foreground/50">/</span>
            <span className="truncate text-foreground">
              #{selectedPrNumber}
              {selectedPr ? ` ${selectedPr.title}` : ""}
            </span>
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="size-3 rounded-full ring-2 ring-card"
            style={{ backgroundColor: languageColor(repo.language) }}
            aria-hidden
          />
          <h2 className="text-xl font-semibold tracking-tight">
            <span className="text-muted-foreground">{owner}/</span>
            {repoName}
          </h2>
          {repo.private ? (
            <Badge variant="outline" className="gap-1 text-[10px] font-medium uppercase tracking-wide">
              <Lock className="size-2.5" />
              Private
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Globe className="size-2.5" />
              Public
            </Badge>
          )}
          {repo.url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => void openExternal(repo.url)}
            >
              <ExternalLink className="size-4" />
              Open on GitHub
            </Button>
          )}
        </div>
        {repo.description && (
          <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{repo.description}</p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Star className="size-3.5" />
            {formatCount(repo.stargazersCount)}
          </span>
          {repo.forksCount != null && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <GitFork className="size-3.5" />
              {formatCount(repo.forksCount)}
            </span>
          )}
          {repo.language && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: languageColor(repo.language) }}
              />
              {repo.language}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 font-mono">
            <GitBranch className="size-3.5" />
            {repo.defaultBranch}
          </span>
        </div>
        <div className="mt-3.5">
          <RepoIndexControls
            owner={owner}
            repo={repoName}
            onStatusChange={setIndexStatus}
          />
        </div>

        <TabsList variant="line" className="mt-4 w-full justify-start gap-5 px-0">
          <TabsTrigger value="overview" className="px-0.5 pb-2.5">Overview</TabsTrigger>
          <TabsTrigger value="source" className="px-0.5 pb-2.5">Source</TabsTrigger>
          <TabsTrigger value="pulls" className="px-0.5 pb-2.5">Pull Requests</TabsTrigger>
        </TabsList>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <TabsContent value="overview" className="animate-in fade-in-0 duration-200">
            <RepoOverview
              repo={repo}
              branchCount={branchCount}
              commitCount={commitCount}
              readme={readme}
              statsLoading={overviewLoading}
              statsError={overviewError}
              readmeLoading={overviewLoading}
            />
          </TabsContent>
          <TabsContent value="source" className="animate-in fade-in-0 duration-200">
            <RepoSourceCode
              key={repo.fullName}
              owner={owner}
              repo={repoName}
              defaultBranch={repo.defaultBranch}
              initialRootContents={rootContents}
              readmePreview={readme}
            />
          </TabsContent>
          <TabsContent value="pulls" className="animate-in fade-in-0 duration-200">
            {selectedPrNumber !== null ? (
              <PullRequestDetail
                owner={owner}
                repo={repoName}
                number={selectedPrNumber}
                indexReady={indexStatus?.status === "ready"}
                onBack={handlePrBack}
              />
            ) : (
              <PullRequestList
                pullRequests={pullRequests}
                loading={prsLoading}
                error={prsError}
                selectedNumber={selectedPrNumber}
                onSelect={handlePrSelect}
              />
            )}
          </TabsContent>
      </div>
    </Tabs>
  );
}
