import { openUrl } from "@tauri-apps/plugin-opener";

/** Open a URL in the user's default browser, falling back to window.open. */
export async function openExternal(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** GitHub web URL for a specific commit in a repository. */
export function commitUrl(owner: string, repo: string, sha: string): string {
  return `https://github.com/${owner}/${repo}/commit/${sha}`;
}
