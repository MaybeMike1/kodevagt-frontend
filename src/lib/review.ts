import { apiFetch } from "./api";
import {
  getCachedReview,
  getInflightReview,
  registerInflightReview,
  setCachedReview,
} from "./reviewCache";
import type { IndexStatus, ReviewJobResponse, ReviewResult } from "./types";

const REVIEW_TIMEOUT_MS = 4 * 60 * 1000;
const POLL_INTERVAL_MS = 1500;

async function parseApiError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? res.statusText;
}

export async function startRepoIndex(owner: string, repo: string): Promise<IndexStatus> {
  const res = await apiFetch(`/index/repos/${owner}/${repo}`, { method: "POST" });
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  return res.json() as Promise<IndexStatus>;
}

export async function getIndexStatus(owner: string, repo: string): Promise<IndexStatus> {
  const res = await apiFetch(`/index/repos/${owner}/${repo}/status`);
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  return res.json() as Promise<IndexStatus>;
}

async function pollReviewJob(jobId: string, signal?: AbortSignal): Promise<ReviewResult> {
  const deadline = Date.now() + REVIEW_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error("Review cancelled");
    const res = await apiFetch(`/review/jobs/${jobId}`);
    if (res.status === 404) throw new Error("Review job not found");
    const job = (await res.json()) as ReviewJobResponse;
    if (job.status === "completed" && job.result) return job.result;
    if (job.status === "failed") {
      throw new Error(job.error ?? "Review failed");
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("Review timed out");
}

export async function runPullRequestReview(
  owner: string,
  repo: string,
  number: number,
  debug = false,
  force = false,
): Promise<ReviewResult> {
  const params = new URLSearchParams();
  if (debug) params.set("debug", "true");
  if (force) params.set("force", "true");
  const qs = params.size > 0 ? `?${params.toString()}` : "";

  const res = await apiFetch(`/review/repos/${owner}/${repo}/pulls/${number}${qs}`, {
    method: "POST",
    signal: AbortSignal.timeout(REVIEW_TIMEOUT_MS),
  });

  if (res.status === 409) throw new Error(await parseApiError(res));
  if (res.status === 202) {
    const job = (await res.json()) as ReviewJobResponse;
    return pollReviewJob(job.jobId);
  }
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<ReviewResult>;
}

export type ReviewRequest = {
  owner: string;
  repo: string;
  number: number;
  headSha?: string | null;
  debug?: boolean;
  force?: boolean;
};

export type ReviewRequestResult = {
  result: ReviewResult;
  fromCache: boolean;
};

export async function requestPullRequestReview(
  request: ReviewRequest,
): Promise<ReviewRequestResult> {
  const { owner, repo, number, headSha, debug = false, force = false } = request;

  if (!force) {
    const cached = getCachedReview(owner, repo, number, headSha);
    if (cached) return { result: cached, fromCache: true };
  }

  let promise = force ? undefined : getInflightReview(owner, repo, number);
  if (!promise) {
    promise = runPullRequestReview(owner, repo, number, debug, force).then((result) => {
      setCachedReview(owner, repo, number, headSha, result);
      return result;
    });
    registerInflightReview(owner, repo, number, promise);
  }

  const result = await promise;
  // A freshly computed result is never "cached" — in-memory cache hits are
  // returned by the early-return above. Only honor the backend's own flag.
  return { result, fromCache: Boolean(result.fromCache) };
}
