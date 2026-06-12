import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { MainPanel } from "@/components/layout/MainPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { usePeriodicSync } from "@/hooks/usePeriodicSync";
import { fetchRepo, fetchUserRepos } from "@/lib/github";
import { useAuth } from "@/lib/auth";
import { BACKGROUND_SYNC_INTERVAL_MS } from "@/lib/sync";
import type { RepoInfo, RepoListItem } from "@/lib/types";

export function MainApp() {
  const { session, logout } = useAuth();
  const [repos, setRepos] = useState<RepoListItem[]>([]);
  const [selectedFullName, setSelectedFullName] = useState<string | null>(null);
  const [selected, setSelected] = useState<RepoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const reposInFlightRef = useRef(false);
  const detailInFlightRef = useRef(false);

  const handleAuthError = useCallback(
    async (message: string) => {
      if (message.includes("401") || message.toLowerCase().includes("not authenticated")) {
        await logout();
      }
    },
    [logout],
  );

  const loadRepos = useCallback(
    async (options?: { background?: boolean }) => {
      const background = options?.background ?? false;
      if (reposInFlightRef.current) return;
      reposInFlightRef.current = true;

      if (!background) {
        setLoading(true);
        setError(null);
      }

      try {
        const list = await fetchUserRepos();
        setRepos(list);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load repositories";
        if (!background) {
          setError(message);
          setRepos([]);
        }
        await handleAuthError(message);
      } finally {
        reposInFlightRef.current = false;
        if (!background) setLoading(false);
      }
    },
    [handleAuthError],
  );

  const refreshSelectedRepo = useCallback(
    async (options?: { background?: boolean; fullName?: string }) => {
      const background = options?.background ?? true;
      const fullName = options?.fullName ?? selectedFullName;
      if (!fullName || detailInFlightRef.current) return;

      const [owner, name] = fullName.split("/", 2);
      if (!owner || !name) return;

      detailInFlightRef.current = true;
      if (!background) {
        setLoadingDetail(true);
        setError(null);
      }

      try {
        const detail = await fetchRepo(owner, name);
        setSelected(detail);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load repository";
        if (!background) {
          setError(message);
          setSelected(null);
        }
        await handleAuthError(message);
      } finally {
        detailInFlightRef.current = false;
        if (!background) setLoadingDetail(false);
      }
    },
    [selectedFullName, handleAuthError],
  );

  useEffect(() => {
    void loadRepos();
  }, [loadRepos]);

  usePeriodicSync(() => loadRepos({ background: true }), BACKGROUND_SYNC_INTERVAL_MS, true);

  usePeriodicSync(
    () => refreshSelectedRepo({ background: true }),
    BACKGROUND_SYNC_INTERVAL_MS,
    selectedFullName !== null,
  );

  async function handleSelectRepo(repo: RepoListItem) {
    setSelectedFullName(repo.fullName);
    setSidebarCollapsed(true);
    detailInFlightRef.current = false;
    await refreshSelectedRepo({ background: false, fullName: repo.fullName });
  }

  function handleBackToRepos() {
    setSelectedFullName(null);
    setSelected(null);
    setSidebarCollapsed(false);
  }

  return (
    <AppShell
      sidebarCollapsed={sidebarCollapsed}
      header={
        <AppHeader
          login={session?.user.login ?? ""}
          avatarUrl={session?.user.avatarUrl}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          onSignOut={() => void logout()}
        />
      }
      sidebar={
        <Sidebar
          repos={repos}
          selectedFullName={selectedFullName}
          loading={loading}
          onSelect={(repo) => void handleSelectRepo(repo)}
        />
      }
      main={
        <div className="flex min-h-0 flex-1 flex-col">
          {error && (
            <div className="shrink-0 px-4 pt-4">
              <Alert variant="destructive">
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
          <MainPanel repo={selected} loading={loadingDetail} onBack={handleBackToRepos} />
        </div>
      }
    />
  );
}
