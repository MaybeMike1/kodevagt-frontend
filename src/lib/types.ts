export type GitHubUser = {
  login: string;
  id: number;
  avatarUrl: string;
};

export type Session = {
  accessToken: string;
  user: GitHubUser;
};

export type RepoListItem = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  defaultBranch: string;
  private: boolean;
  url: string;
  language: string | null;
  stargazersCount: number;
};

export type RepoList = {
  repos: RepoListItem[];
};

export type RepoInfo = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  private: boolean;
  url: string;
  language: string | null;
  stargazersCount: number;
  forksCount?: number;
};

export type PullRequestState = "open" | "closed" | "merged";

/** Shape returned by GET /github/repos/:owner/:repo/pulls */
export type PullRequestListItem = {
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  user: {
    login: string;
    avatarUrl: string;
  };
  headRef: string;
  baseRef: string;
  draft?: boolean;
};

export type PullRequestListResponse = {
  pulls: PullRequestListItem[];
};

/** UI model used by PullRequestList */
export type PullRequest = {
  number: number;
  title: string;
  state: PullRequestState;
  author: string;
  authorAvatarUrl?: string | null;
  updatedAt: string;
  url: string;
  headRef: string;
  baseRef: string;
  draft?: boolean;
};

export type PullRequestLabel = {
  name: string;
  color: string;
};

/** Shape returned by GET /github/repos/:owner/:repo/pulls/:number */
export type PullRequestDetailResponse = {
  number: number;
  title: string;
  body: string | null;
  state: string;
  merged: boolean;
  mergedAt: string | null;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  user: {
    login: string;
    avatarUrl: string;
  };
  headRef: string;
  baseRef: string;
  draft?: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: PullRequestLabel[];
};

export type PullRequestDetail = {
  number: number;
  title: string;
  body: string | null;
  state: PullRequestState;
  htmlUrl: string;
  author: string;
  authorAvatarUrl: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  headRef: string;
  baseRef: string;
  draft?: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: PullRequestLabel[];
};

export type PullRequestFileStatus =
  | "added"
  | "modified"
  | "removed"
  | "renamed"
  | "copied"
  | "changed"
  | "unchanged";

export type PullRequestFileItem = {
  filename: string;
  status: PullRequestFileStatus;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
  previousFilename?: string | null;
};

export type PullRequestFilesResponse = {
  files: PullRequestFileItem[];
};

export type PullRequestCommitItem = {
  sha: string;
  message: string;
  author: {
    login: string;
    avatarUrl: string | null;
  } | null;
  committedAt: string;
};

export type PullRequestCommitsResponse = {
  commits: PullRequestCommitItem[];
};

export type GitHubBranch = {
  name: string;
  commit: { sha: string };
  protected?: boolean;
};

export type ContentItemType = "file" | "dir";

export type ContentItem = {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: ContentItemType;
  downloadUrl?: string | null;
};

/** Single file from GET .../contents/{path} */
export type ContentFileEntry = ContentItem & {
  type: "file";
  content: string;
  encoding: string;
};

export type RepoContentsResult =
  | { kind: "directory"; items: ContentItem[] }
  | { kind: "file"; file: ContentFileEntry };

export type FileContent = {
  name: string;
  path: string;
  text: string;
  size: number;
};

export type IndexStatus = {
  owner: string;
  repo: string;
  ref: string;
  treeSha: string;
  chunkCount: number;
  fileCount: number;
  status: "idle" | "indexing" | "ready" | "failed";
  error?: string;
  completedAt?: string;
  startedAt?: string;
};

export type ReviewSeverity = "info" | "suggestion" | "warning" | "critical";
export type VerifierVerdict = "supported" | "partial" | "unsupported" | "hallucinated";

export type ReviewFinding = {
  id: string;
  severity: ReviewSeverity;
  file?: string;
  line?: number;
  title: string;
  body: string;
  confidence: number;
  validation?: {
    verdict: VerifierVerdict;
    confidence: number;
    rationale: string;
  };
  accuracyScore: number;
  citationValid: boolean;
};

export type ReviewMetrics = {
  overallAccuracy: number;
  supportedRate: number;
  hallucinationRate: number;
  avgGeneratorConfidence: number;
  avgVerifierConfidence: number;
  citationAccuracy: number;
  findingCount: number;
};

export type ReviewContextStats = {
  changedFiles: number;
  filesWithPatch: number;
  filesWithoutPatch: number;
  ragSnippetCount: number;
};

export type ReviewResult = {
  reviewId: string;
  summary: string;
  thoughtProcess: string;
  findings: ReviewFinding[];
  metrics: ReviewMetrics;
  context: ReviewContextStats;
  usedFallback?: boolean;
  qualityTier?: "strict" | "relaxed" | "best-effort" | "none";
  candidatesBeforeFilter?: number;
  headSha?: string;
  fromCache?: boolean;
  model: string;
  verifierModel: string;
  indexedRef: string;
  durationMs: number;
};

export type ReviewJobResponse = {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  pollUrl: string;
  owner: string;
  repo: string;
  number: number;
  headSha?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
  result?: ReviewResult;
};

export type RepoOverviewData = {
  branchCount: number;
  commitCount: number;
  rootContents: ContentItem[];
  readme: FileContent | null;
};
