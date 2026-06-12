import { invoke } from "@tauri-apps/api/core";
import type { Session } from "./types";

const DEFAULT_API_URL = "http://localhost:3000";

/** Base URL without trailing slashes; empty env values fall back to localhost:3000. */
function resolveApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return DEFAULT_API_URL;

  let url = raw.replace(/\/+$/, "");
  // Routes are mounted at /github and /auth — not /api/github.
  if (url.endsWith("/api")) {
    url = url.slice(0, -"/api".length);
    if (import.meta.env.DEV) {
      console.warn(
        "[api] VITE_API_URL included /api; stripped it. Use the server root (e.g. http://localhost:3000).",
      );
    }
  }
  return url;
}

const API_URL = resolveApiUrl();

if (import.meta.env.DEV) {
  console.log(`[api] backend base URL: ${API_URL}`);
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

async function getAccessToken(): Promise<string | null> {
  const session = await invoke<Session | null>("get_session");
  return session?.accessToken ?? null;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const url = buildApiUrl(path);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (import.meta.env.DEV && response.status === 404) {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      console.warn(
        `[api] 404 Not Found (non-JSON): ${url} — check VITE_API_URL; routes live at /github/... not /api/github/...`,
      );
    } else {
      console.warn(`[api] 404 Not Found: ${url}`);
    }
  }

  return response;
}

export function getApiUrl(): string {
  return API_URL;
}
