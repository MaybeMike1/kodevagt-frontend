import type { ReviewResult } from "./types";

/**
 * In-memory (and best-effort persisted) cache for AI review results plus
 * in-flight request de-duplication.
 *
 * AI reviews are expensive (a local LLM call that can take minutes), so we key
 * results by repo + PR number and invalidate when the PR head SHA changes. This
 * makes re-opening a PR instant and prevents duplicate concurrent runs.
 */

type CacheEntry = {
  headSha: string | null;
  result: ReviewResult;
  storedAt: number;
};

const STORAGE_PREFIX = "kodevagt:review:";
const MAX_PERSISTED = 20;

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ReviewResult>>();

function keyFor(owner: string, repo: string, number: number): string {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}#${number}`;
}

function readPersisted(key: string): CacheEntry | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function writePersisted(key: string, entry: CacheEntry): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    prunePersisted();
  } catch {
    // Storage full / unavailable — in-memory cache still works.
  }
}

function prunePersisted(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    if (keys.length <= MAX_PERSISTED) return;
    const sorted = keys
      .map((k) => {
        let storedAt = 0;
        try {
          storedAt = (JSON.parse(window.localStorage.getItem(k) ?? "{}") as CacheEntry).storedAt ?? 0;
        } catch {
          storedAt = 0;
        }
        return { k, storedAt };
      })
      .sort((a, b) => a.storedAt - b.storedAt);
    for (const { k } of sorted.slice(0, sorted.length - MAX_PERSISTED)) {
      window.localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

function dropPersisted(key: string): void {
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}

/**
 * Returns a cached review if present and still valid for `headSha`. A mismatched
 * head SHA means the PR has new commits, so the stale entry is discarded.
 */
export function getCachedReview(
  owner: string,
  repo: string,
  number: number,
  headSha?: string | null,
): ReviewResult | null {
  const key = keyFor(owner, repo, number);
  let entry = memory.get(key);
  if (!entry) {
    const persisted = readPersisted(key);
    if (persisted) {
      memory.set(key, persisted);
      entry = persisted;
    }
  }
  if (!entry) return null;

  if (headSha && entry.headSha && entry.headSha !== headSha) {
    memory.delete(key);
    dropPersisted(key);
    return null;
  }
  return entry.result;
}

export function setCachedReview(
  owner: string,
  repo: string,
  number: number,
  headSha: string | null | undefined,
  result: ReviewResult,
): void {
  const key = keyFor(owner, repo, number);
  const entry: CacheEntry = {
    headSha: headSha ?? null,
    result,
    storedAt: Date.now(),
  };
  memory.set(key, entry);
  writePersisted(key, entry);
}

/** Tracks an in-flight request so concurrent callers share one network call. */
export function getInflightReview(
  owner: string,
  repo: string,
  number: number,
): Promise<ReviewResult> | undefined {
  return inflight.get(keyFor(owner, repo, number));
}

export function registerInflightReview(
  owner: string,
  repo: string,
  number: number,
  promise: Promise<ReviewResult>,
): void {
  const key = keyFor(owner, repo, number);
  inflight.set(key, promise);
  void promise.finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
}
