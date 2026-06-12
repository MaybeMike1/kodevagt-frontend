import { useEffect, useMemo, useRef, useState } from "react";
import { FileCode, Loader2, RotateCw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requestPullRequestReview } from "@/lib/review";
import { getCachedReview } from "@/lib/reviewCache";
import type { ReviewFinding, ReviewResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ReviewMetricsBar } from "./ReviewMetricsBar";
import { ThoughtProcessPanel } from "./ThoughtProcessPanel";

type AiReviewSectionProps = {
  owner: string;
  repo: string;
  number: number;
  indexReady: boolean;
  /** Head commit SHA; lets cached reviews invalidate when the PR changes. */
  headSha?: string | null;
  /** Paths of files changed in this PR; used to know which findings are linkable. */
  changedFiles?: string[];
  /** Reveal a finding's file (and optional line) in the Files changed diff. */
  onNavigateToFinding?: (file: string, line?: number) => void;
};

const severityClass: Record<ReviewFinding["severity"], string> = {
  info: "border-muted-foreground/30",
  suggestion: "border-blue-500/40",
  warning: "border-amber-500/50",
  critical: "border-red-500/60",
};

const verdictClass: Record<string, string> = {
  supported: "text-emerald-400",
  partial: "text-amber-400",
  unsupported: "text-orange-400",
  hallucinated: "text-red-400",
};

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function AiReviewSection({
  owner,
  repo,
  number,
  indexReady,
  headSha,
  changedFiles,
  onNavigateToFinding,
}: AiReviewSectionProps) {
  const changedFileSet = useMemo(() => new Set(changedFiles ?? []), [changedFiles]);
  const [result, setResult] = useState<ReviewResult | null>(() =>
    getCachedReview(owner, repo, number, headSha),
  );
  const [fromCache, setFromCache] = useState(() => result !== null);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const cached = getCachedReview(owner, repo, number, headSha);
    setResult(cached);
    setFromCache(cached !== null);
    setError(null);
  }, [owner, repo, number, headSha]);

  useEffect(() => {
    if (!loading) return;
    const startedAt = Date.now();
    setElapsedMs(0);
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);
    return () => window.clearInterval(id);
  }, [loading]);

  async function handleRunReview(force = false) {
    setLoading(true);
    setError(null);
    try {
      const { result: review, fromCache: cached } = await requestPullRequestReview({
        owner,
        repo,
        number,
        headSha,
        force,
      });
      if (!mountedRef.current) return;
      setResult(review);
      setFromCache(cached);
    } catch (err) {
      if (!mountedRef.current) return;
      setResult(null);
      let msg = err instanceof Error ? err.message : "AI review failed";
      if (err instanceof Error && err.name === "TimeoutError") {
        msg = "Review timed out after 4 minutes. Try again or use a smaller PR.";
      }
      setError(
        msg.includes("ollama pull") || msg.includes("Chat model")
          ? `${msg} Then retry the review.`
          : msg,
      );
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  return (
    <section className="surface-card space-y-4 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-inset ring-primary/20">
            <Sparkles className="size-4 text-primary" />
          </span>
          <h4 className="text-sm font-semibold">AI code review</h4>
          {fromCache && result && !loading && (
            <Badge variant="secondary" className="text-[10px]" title="Loaded from a previous run">
              cached
            </Badge>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!indexReady || loading}
          onClick={() => void handleRunReview(result !== null)}
          title={
            indexReady
              ? undefined
              : "Index the repository first using the controls in the repository header"
          }
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {`Reviewing… ${formatElapsed(elapsedMs)}`}
            </>
          ) : result ? (
            <>
              <RotateCw className="size-4" />
              Re-run review
            </>
          ) : (
            "Run AI review"
          )}
        </Button>
      </div>

      {!indexReady && (
        <p className="text-xs text-muted-foreground">
          Index this repository using the &quot;Index for AI review&quot; control in the
          repository header before running AI review.
        </p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Review failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !result && (
        <div className="space-y-3" aria-hidden>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {result.usedFallback && (
            <Alert>
              <AlertTitle>Heuristic review</AlertTitle>
              <AlertDescription>
                The local model did not return structured findings. Listed items are
                file-based placeholders — open each diff on GitHub for a full review.
              </AlertDescription>
            </Alert>
          )}
          <ReviewMetricsBar metrics={result.metrics} />
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              Model-estimated accuracy · {result.durationMs}ms · ref{" "}
              <code className="font-mono">{result.indexedRef}</code>
            </span>
            {result.qualityTier && result.qualityTier !== "none" && (
              <Badge variant="outline" className="text-[10px] uppercase" title="Confidence tier of the filtered findings">
                {result.qualityTier}
              </Badge>
            )}
          </p>
          <ThoughtProcessPanel thoughtProcess={result.thoughtProcess} />
          <div className="prose prose-invert max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {result.summary}
            </ReactMarkdown>
          </div>
          {result.context && (
            <p className="text-xs text-muted-foreground">
              {result.context.changedFiles} files · {result.context.filesWithPatch} with diff
              {result.context.filesWithoutPatch > 0 &&
                ` · ${result.context.filesWithoutPatch} without inline patch (GitHub limit)`}
              {result.context.ragSnippetCount > 0 &&
                ` · ${result.context.ragSnippetCount} context snippets`}
            </p>
          )}
          {result.findings.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No findings were returned. Expand &quot;Show reasoning&quot; above for the model summary,
              or check the Files changed tab.
            </p>
          ) : (
          <ul className="space-y-3">
            {result.findings.map((finding) => (
              <li
                key={finding.id}
                className={cn(
                  "rounded-lg border bg-muted/10 p-3",
                  severityClass[finding.severity],
                  finding.validation?.verdict === "hallucinated" && "bg-red-500/5",
                )}
              >
                <Card size="sm" className="border-0 bg-transparent shadow-none">
                  <CardHeader className="pb-2">
                    {finding.file && (
                      (() => {
                        const linkable =
                          onNavigateToFinding != null && changedFileSet.has(finding.file);
                        const label = (
                          <>
                            <FileCode className="size-3.5 shrink-0" />
                            <span className="truncate">{finding.file}</span>
                            {finding.line !== undefined && (
                              <span className="text-foreground/80">:{finding.line}</span>
                            )}
                          </>
                        );
                        if (linkable) {
                          return (
                            <Button
                              type="button"
                              variant="link"
                              size="xs"
                              className="mb-1.5 -ml-1 h-auto max-w-full justify-start gap-1 px-1 font-mono text-amber-400/90 hover:text-amber-300"
                              onClick={() =>
                                onNavigateToFinding(finding.file!, finding.line)
                              }
                              title={`Open ${finding.file}${
                                finding.line !== undefined ? `:${finding.line}` : ""
                              } in Files changed`}
                            >
                              {label}
                            </Button>
                          );
                        }
                        const notInPr = onNavigateToFinding != null;
                        return (
                          <p
                            className="mb-1.5 flex items-center gap-1 font-mono text-xs font-medium text-amber-400/90"
                            title={
                              notInPr
                                ? "This file is not part of this pull request's changes"
                                : undefined
                            }
                          >
                            {label}
                            {notInPr && (
                              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                                not in this PR
                              </span>
                            )}
                          </p>
                        );
                      })()
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-sm">{finding.title}</CardTitle>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {finding.severity}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {Math.round(finding.confidence * 100)}% conf
                      </Badge>
                      {finding.validation && (
                        <span
                          className={cn(
                            "text-[10px] font-medium uppercase",
                            verdictClass[finding.validation.verdict],
                          )}
                        >
                          {finding.validation.verdict}
                        </span>
                      )}
                      {!finding.citationValid && (
                        <Badge variant="destructive" className="text-[10px]">
                          bad citation
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-foreground/90">
                    <p>{finding.body}</p>
                    {finding.validation?.rationale && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Verifier: {finding.validation.rationale}
                      </p>
                    )}
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary/70"
                        style={{ width: `${finding.accuracyScore * 100}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          )}
        </div>
      )}
    </section>
  );
}
