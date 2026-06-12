import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ExternalLink,
  FileText,
  GitCommit,
  FileDiff,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrStateBadge } from "@/components/PrStateBadge";
import { usePeriodicSync } from "@/hooks/usePeriodicSync";
import {
  fetchPullRequest,
  fetchPullRequestCommits,
  fetchPullRequestFiles,
} from "@/lib/github";
import { formatCount, formatDate, formatRelativeTime } from "@/lib/format";
import { commitUrl, openExternal } from "@/lib/open";
import { cn } from "@/lib/utils";
import { BACKGROUND_SYNC_INTERVAL_MS } from "@/lib/sync";
import type {
  PullRequestCommitItem,
  PullRequestDetail as PullRequestDetailType,
  PullRequestFileItem,
} from "@/lib/types";
import { AiReviewSection } from "@/components/review/AiReviewSection";
import { PrFileList, type PrFileNavTarget } from "./PrFileList";

type PullRequestDetailProps = {
  owner: string;
  repo: string;
  number: number;
  indexReady?: boolean;
  onBack: () => void;
};

function PrDescription({ body }: { body: string | null }) {
  if (!body?.trim()) {
    return <p className="text-sm text-muted-foreground">No description provided.</p>;
  }

  return (
    <div className="prose prose-invert max-w-none text-sm text-foreground/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}

function DiffBar({ additions, deletions }: { additions: number; deletions: number }) {
  const total = additions + deletions;
  const blocks = 5;
  const greenBlocks = total === 0 ? 0 : Math.round((additions / total) * blocks);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: blocks }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-[2px]",
            i < greenBlocks ? "bg-success" : total > 0 ? "bg-destructive" : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

function PrStatsRow({ pr }: { pr: PullRequestDetailType }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="font-mono font-medium text-success">+{formatCount(pr.additions)}</span>
      <span className="font-mono font-medium text-destructive">−{formatCount(pr.deletions)}</span>
      <DiffBar additions={pr.additions} deletions={pr.deletions} />
      <span className="text-muted-foreground">
        {formatCount(pr.changedFiles)} {pr.changedFiles === 1 ? "file" : "files"} changed
      </span>
    </div>
  );
}

function CommitList({
  commits,
  owner,
  repo,
}: {
  commits: PullRequestCommitItem[];
  owner: string;
  repo: string;
}) {
  if (commits.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No commits found for this pull request.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {commits.map((commit) => {
        const title = commit.message.split("\n")[0] ?? commit.message;
        return (
          <li key={commit.sha} className="group flex items-start gap-3 px-4 py-3">
            {commit.author ? (
              <Avatar size="sm">
                {commit.author.avatarUrl && (
                  <AvatarImage src={commit.author.avatarUrl} alt={commit.author.login} />
                )}
                <AvatarFallback>{commit.author.login.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                ?
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {commit.author?.login ?? "Unknown"} · {commit.sha.slice(0, 7)} ·{" "}
                {formatRelativeTime(commit.committedAt)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => void openExternal(commitUrl(owner, repo, commit.sha))}
              aria-label={`Open commit ${commit.sha.slice(0, 7)} on GitHub`}
              title="Open commit on GitHub"
            >
              <ExternalLink className="size-3.5" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export function PullRequestDetail({
  owner,
  repo,
  number,
  indexReady = false,
  onBack,
}: PullRequestDetailProps) {
  const [pr, setPr] = useState<PullRequestDetailType | null>(null);
  const [files, setFiles] = useState<PullRequestFileItem[]>([]);
  const [commits, setCommits] = useState<PullRequestCommitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [fileNavTarget, setFileNavTarget] = useState<PrFileNavTarget | null>(null);

  const handleNavigateToFinding = useCallback((file: string, line?: number) => {
    setDetailTab("files");
    setFileNavTarget((prev) => ({ file, line, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const load = useCallback(
    async (background = false) => {
      if (!background) {
        setLoading(true);
        setError(null);
      }

      try {
        const [detail, fileList, commitList] = await Promise.all([
          fetchPullRequest(owner, repo, number),
          fetchPullRequestFiles(owner, repo, number),
          fetchPullRequestCommits(owner, repo, number),
        ]);
        setPr(detail);
        setFiles(fileList);
        setCommits(commitList);
      } catch (err) {
        if (!background) {
          setPr(null);
          setFiles([]);
          setCommits([]);
          setError(err instanceof Error ? err.message : "Failed to load pull request");
        }
      } finally {
        if (!background) setLoading(false);
      }
    },
    [owner, repo, number],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  usePeriodicSync(() => load(true), BACKGROUND_SYNC_INTERVAL_MS, pr?.state === "open");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-full max-w-2xl" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
          <ChevronLeft className="size-4" />
          Back to pull requests
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Could not load pull request</AlertTitle>
          <AlertDescription>{error ?? "Pull request not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
          <ChevronLeft className="size-4" />
          Back to pull requests
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void openExternal(pr.htmlUrl)}
        >
          <ExternalLink className="size-4" />
          Open on GitHub
        </Button>
      </div>

      <header className="surface-card space-y-3.5 rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          <PrStateBadge state={pr.state} draft={pr.draft} />
          <span className="font-mono text-sm text-muted-foreground">#{pr.number}</span>
          {pr.labels.map((label) => (
            <Badge
              key={label.name}
              variant="outline"
              className="text-[10px]"
              style={{
                borderColor: `#${label.color}55`,
                backgroundColor: `#${label.color}22`,
                color: `#${label.color}`,
              }}
            >
              {label.name}
            </Badge>
          ))}
        </div>
        <h3 className="text-2xl font-semibold leading-tight tracking-tight">{pr.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Avatar size="sm" className="size-5">
            <AvatarImage src={pr.authorAvatarUrl} alt={pr.author} />
            <AvatarFallback>{pr.author.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span>
            <span className="font-medium text-foreground">{pr.author}</span> opened{" "}
            {formatRelativeTime(pr.createdAt)}
          </span>
          {pr.mergedAt && (
            <span className="text-muted-foreground/70">· merged {formatRelativeTime(pr.mergedAt)}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">{pr.headRef}</span>
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">{pr.baseRef}</span>
        </div>
        <div className="border-t border-border pt-3.5">
          <PrStatsRow pr={pr} />
        </div>
      </header>

      <Tabs value={detailTab} onValueChange={setDetailTab}>
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="overview">
            <FileText className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileDiff className="size-3.5" />
            Files changed
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {files.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="commits">
            <GitCommit className="size-3.5" />
            Commits
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {commits.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6 animate-in fade-in-0 duration-200">
          <section className="surface-card overflow-hidden rounded-xl">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
              <Avatar size="sm" className="size-5">
                <AvatarImage src={pr.authorAvatarUrl} alt={pr.author} />
                <AvatarFallback>{pr.author.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{pr.author}</span>
              <span>commented {formatDate(pr.createdAt)}</span>
            </div>
            <div className="p-4">
              <PrDescription body={pr.body} />
            </div>
          </section>
          <AiReviewSection
            owner={owner}
            repo={repo}
            number={number}
            indexReady={indexReady}
            headSha={commits.length > 0 ? commits[commits.length - 1]?.sha : undefined}
            changedFiles={files.map((file) => file.filename)}
            onNavigateToFinding={handleNavigateToFinding}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-4 animate-in fade-in-0 duration-200">
          <PrFileList files={files} navTarget={fileNavTarget} />
        </TabsContent>

        <TabsContent value="commits" className="mt-4 animate-in fade-in-0 duration-200">
          <CommitList commits={commits} owner={owner} repo={repo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
