import { apiFetch } from "./api";
import type {
  ContentFileEntry,
  ContentItem,
  FileContent,
  GitHubBranch,
  PullRequest,
  PullRequestCommitItem,
  PullRequestCommitsResponse,
  PullRequestDetail,
  PullRequestDetailResponse,
  PullRequestFileItem,
  PullRequestFilesResponse,
  PullRequestListItem,
  PullRequestListResponse,
  PullRequestState,
  RepoContentsResult,
  RepoInfo,
  RepoList,
  RepoListItem,
} from "./types";

async function parseApiError(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  if (res.status === 404 && !contentType.includes("application/json")) {
    return (
      "API route not found. Check VITE_API_URL — use the server root (e.g. http://localhost:3000) " +
      "without an /api prefix; GitHub routes are at /github/..."
    );
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? res.statusText;
}

/** Encoded /github/repos/{owner}/{repo}{suffix} path for the kodevagt API. */
function repoApiPath(owner: string, repo: string, suffix = ""): string {
  return `/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${suffix}`;
}

export function splitRepoFullName(fullName: string): [owner: string, repo: string] {
  const [owner, name] = fullName.split("/", 2);
  if (!owner || !name) {
    throw new Error(`Invalid repository name: ${fullName}`);
  }
  return [owner, name];
}

function parseLastPageFromLink(linkHeader: string | null): number | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function decodeBase64Content(encoded: string): string {
  const binary = atob(encoded.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

type RawContentItem = ContentItem & {
  download_url?: string | null;
  content?: string;
  encoding?: string;
};

function normalizeContentType(type: string | undefined): ContentItem["type"] {
  if (type === "dir" || type === "tree") return "dir";
  return "file";
}

function normalizeContentItem(item: RawContentItem): ContentItem {
  return {
    name: item.name,
    path: item.path,
    sha: item.sha,
    size: item.size ?? 0,
    type: normalizeContentType(item.type),
    downloadUrl: item.downloadUrl ?? item.download_url ?? null,
  };
}

function normalizeContentFile(item: RawContentItem): ContentFileEntry {
  const base = normalizeContentItem(item);
  return {
    ...base,
    type: "file",
    content: item.content ?? "",
    encoding: item.encoding ?? "base64",
  };
}

function sortContentItems(items: ContentItem[]): ContentItem[] {
  return [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function contentsUrl(owner: string, repo: string, path: string, ref: string): string {
  const refParam = encodeURIComponent(ref);
  if (!path) {
    return `${repoApiPath(owner, repo)}/contents/?ref=${refParam}`;
  }
  const pathParam = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${repoApiPath(owner, repo)}/contents/${pathParam}?ref=${refParam}`;
}

function decodeFileText(content: string, encoding: string): string {
  if (encoding === "utf-8") return content;
  if (encoding === "base64" || !encoding) {
    return decodeBase64Content(content);
  }
  return content;
}

function fileNameFromPath(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 1] ?? path;
}

const MAX_INLINE_FILE_BYTES = 1024 * 1024;

function isLikelyBinaryText(text: string): boolean {
  return text.includes("\u0000");
}

function parseContentsPayload(data: unknown): RepoContentsResult {
  if (Array.isArray(data)) {
    return {
      kind: "directory",
      items: sortContentItems(data.map((item) => normalizeContentItem(item as RawContentItem))),
    };
  }

  if (data && typeof data === "object") {
    const entry = data as RawContentItem;
    if (entry.type === "dir") {
      return { kind: "directory", items: [normalizeContentItem(entry)] };
    }
    if (entry.content != null || entry.encoding != null) {
      return { kind: "file", file: normalizeContentFile(entry) };
    }
    if (entry.name && entry.path) {
      return { kind: "directory", items: sortContentItems([normalizeContentItem(entry)]) };
    }
  }

  return { kind: "directory", items: [] };
}

async function fetchTextFromDownloadUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download file (${res.status})`);
  }
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_INLINE_FILE_BYTES) {
    throw new Error("File is too large to preview in the app");
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (isLikelyBinaryText(text)) {
    throw new Error("Binary files cannot be previewed as text");
  }
  return text;
}

export async function fetchUserRepos(): Promise<RepoListItem[]> {
  const res = await apiFetch("/github/repos?sort=updated&per_page=100");
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  const data = (await res.json()) as RepoList;
  return data.repos;
}

export async function fetchRepo(owner: string, repo: string): Promise<RepoInfo> {
  const res = await apiFetch(repoApiPath(owner, repo));
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  return res.json() as Promise<RepoInfo>;
}

function mapPullRequestState(state: string): PullRequestState {
  if (state === "open" || state === "merged") {
    return state;
  }
  return "closed";
}

function mapPullRequestItem(item: PullRequestListItem): PullRequest {
  return {
    number: item.number,
    title: item.title,
    state: mapPullRequestState(item.state),
    author: item.user.login,
    authorAvatarUrl: item.user.avatarUrl,
    updatedAt: item.updatedAt,
    url: item.htmlUrl,
    headRef: item.headRef,
    baseRef: item.baseRef,
    draft: item.draft,
  };
}

export async function fetchPullRequests(owner: string, repo: string): Promise<PullRequest[]> {
  const res = await apiFetch(`${repoApiPath(owner, repo)}/pulls?state=all&per_page=50`);
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  const data = (await res.json()) as PullRequestListResponse;
  return (data.pulls ?? []).map(mapPullRequestItem);
}

function mapPullRequestDetail(data: PullRequestDetailResponse): PullRequestDetail {
  return {
    number: data.number,
    title: data.title,
    body: data.body,
    state: data.merged ? "merged" : mapPullRequestState(data.state),
    htmlUrl: data.htmlUrl,
    author: data.user.login,
    authorAvatarUrl: data.user.avatarUrl,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    mergedAt: data.mergedAt,
    headRef: data.headRef,
    baseRef: data.baseRef,
    draft: data.draft,
    additions: data.additions,
    deletions: data.deletions,
    changedFiles: data.changedFiles,
    labels: data.labels ?? [],
  };
}

export async function fetchPullRequest(
  owner: string,
  repo: string,
  number: number,
): Promise<PullRequestDetail> {
  const res = await apiFetch(`${repoApiPath(owner, repo)}/pulls/${number}`);
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  const data = (await res.json()) as PullRequestDetailResponse;
  return mapPullRequestDetail(data);
}

export async function fetchPullRequestFiles(
  owner: string,
  repo: string,
  number: number,
): Promise<PullRequestFileItem[]> {
  const res = await apiFetch(`${repoApiPath(owner, repo)}/pulls/${number}/files`);
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  const data = (await res.json()) as PullRequestFilesResponse;
  return data.files ?? [];
}

export async function fetchPullRequestCommits(
  owner: string,
  repo: string,
  number: number,
): Promise<PullRequestCommitItem[]> {
  const res = await apiFetch(`${repoApiPath(owner, repo)}/pulls/${number}/commits`);
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  const data = (await res.json()) as PullRequestCommitsResponse;
  return data.commits ?? [];
}

/** GET /github/repos/{owner}/{repo}/branches — paginated branch count */
export async function fetchBranchCount(owner: string, repo: string): Promise<number> {
  let count = 0;
  let page = 1;

  while (true) {
    const res = await apiFetch(
      `${repoApiPath(owner, repo)}/branches?per_page=100&page=${page}`,
    );
    if (!res.ok) {
      const message = await parseApiError(res);
      if (res.status === 404) {
        throw new Error(
          `${message} (${owner}/${repo}). GitHub returned 404 — the repository may not exist or your token may lack access.`,
        );
      }
      throw new Error(message);
    }
    const branches = (await res.json()) as GitHubBranch[];
    count += branches.length;
    if (branches.length < 100) break;
    page += 1;
  }

  return count;
}

/** GET /github/repos/{owner}/{repo}/commits?per_page=1 — total from Link rel="last" */
export async function fetchCommitCount(
  owner: string,
  repo: string,
  defaultBranch: string,
): Promise<number> {
  const ref = encodeURIComponent(defaultBranch);
  const res = await apiFetch(`${repoApiPath(owner, repo)}/commits?per_page=1&sha=${ref}`);
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const commits = (await res.json()) as unknown[];
  if (commits.length === 0) return 0;

  const lastPage = parseLastPageFromLink(res.headers.get("Link"));
  return lastPage ?? 1;
}

/**
 * GET /github/repos/{owner}/{repo}/contents/{path}?ref=
 * Directory listing or single file (ContentFileEntry).
 */
export async function fetchRepoContents(
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<RepoContentsResult> {
  const res = await apiFetch(contentsUrl(owner, repo, path, ref));
  if (res.status === 404) {
    return { kind: "directory", items: [] };
  }
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const data: unknown = await res.json();
  return parseContentsPayload(data);
}

/** GET /github/repos/{owner}/{repo}/contents/ — root directory listing */
export async function fetchRepoRootContents(
  owner: string,
  repo: string,
  ref: string,
): Promise<ContentItem[]> {
  const result = await fetchRepoContents(owner, repo, "", ref);
  if (result.kind === "file") {
    return [result.file];
  }
  return result.items;
}

const README_PATTERN = /^readme(\.(md|markdown|txt|rst))?$/i;

export function findReadmePath(contents: ContentItem[]): string | null {
  const readme = contents.find((item) => item.type === "file" && README_PATTERN.test(item.name));
  return readme?.path ?? null;
}

export function fileContentFromEntry(entry: ContentFileEntry): FileContent {
  return {
    name: entry.name,
    path: entry.path,
    text: decodeFileText(entry.content, entry.encoding),
    size: entry.size,
  };
}

/**
 * File text via GET .../file?path= (decoded utf-8) or .../contents/{path} fallback.
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<FileContent> {
  const refParam = encodeURIComponent(ref);
  const pathQuery = encodeURIComponent(path);

  const fileRes = await apiFetch(
    `${repoApiPath(owner, repo)}/file?path=${pathQuery}&ref=${refParam}`,
  );
  if (fileRes.ok) {
    const data = (await fileRes.json()) as {
      path: string;
      content: string;
      encoding?: string;
      size: number;
    };
    return {
      name: fileNameFromPath(data.path),
      path: data.path,
      text: data.content,
      size: data.size,
    };
  }

  const contentsRes = await apiFetch(contentsUrl(owner, repo, path, ref));
  if (!contentsRes.ok) {
    throw new Error(await parseApiError(contentsRes));
  }

  const parsed = parseContentsPayload(await contentsRes.json());
  if (parsed.kind === "directory") {
    throw new Error(`${path} is a directory, not a file`);
  }

  const data = parsed.file;
  if (data.size > MAX_INLINE_FILE_BYTES) {
    throw new Error("File is too large to preview in the app");
  }

  if (data.content) {
    const text = decodeFileText(data.content, data.encoding ?? "base64");
    if (isLikelyBinaryText(text)) {
      throw new Error("Binary files cannot be previewed as text");
    }
    return {
      name: data.name || fileNameFromPath(path),
      path: data.path,
      text,
      size: data.size,
    };
  }

  const downloadUrl = data.downloadUrl;
  if (!downloadUrl) {
    throw new Error(`No content returned for ${path}`);
  }

  const text = await fetchTextFromDownloadUrl(downloadUrl);
  return {
    name: data.name || fileNameFromPath(path),
    path: data.path,
    text,
    size: data.size,
  };
}

export async function fetchRepoOverviewData(
  owner: string,
  repo: string,
  defaultBranch: string,
): Promise<{
  branchCount: number;
  commitCount: number;
  rootContents: ContentItem[];
  readme: FileContent | null;
}> {
  const [branchCount, commitCount, rootContents] = await Promise.all([
    fetchBranchCount(owner, repo),
    fetchCommitCount(owner, repo, defaultBranch),
    fetchRepoRootContents(owner, repo, defaultBranch),
  ]);

  const readmePath = findReadmePath(rootContents);
  let readme: FileContent | null = null;
  if (readmePath) {
    try {
      readme = await fetchFileContent(owner, repo, readmePath, defaultBranch);
    } catch {
      readme = null;
    }
  }

  return { branchCount, commitCount, rootContents, readme };
}
