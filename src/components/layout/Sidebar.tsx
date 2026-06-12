import { useMemo, useState } from "react";
import { FolderGit2, Globe, Lock, Search, Star, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/format";
import { languageColor } from "@/lib/language";
import { cn } from "@/lib/utils";
import type { RepoListItem } from "@/lib/types";

type SidebarProps = {
  repos: RepoListItem[];
  selectedFullName: string | null;
  loading?: boolean;
  onSelect: (repo: RepoListItem) => void;
};

export function Sidebar({ repos, selectedFullName, loading, onSelect }: SidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (repo) =>
        repo.fullName.toLowerCase().includes(q) ||
        repo.description?.toLowerCase().includes(q) ||
        repo.language?.toLowerCase().includes(q),
    );
  }, [repos, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-sidebar-border px-3 pt-3 pb-3">
        <div className="flex items-center justify-between px-0.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <FolderGit2 className="size-3.5" />
            Repositories
          </p>
          {!loading && repos.length > 0 && (
            <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {repos.length}
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repositories…"
            className="h-9 border-transparent bg-sidebar-accent/60 pr-7 pl-8 text-sm focus-visible:bg-sidebar-accent"
            aria-label="Search repositories"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {loading ? (
            <div className="space-y-1.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded-lg px-2.5 py-2.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="mt-2 h-2.5 w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-sidebar-accent">
                <Search className="size-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {repos.length === 0 ? "No repositories" : "No matches"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {repos.length === 0
                  ? "We couldn't find any repositories for your account."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((repo, index) => {
                const isSelected = selectedFullName === repo.fullName;
                const [owner, name] = repo.fullName.includes("/")
                  ? repo.fullName.split("/", 2)
                  : ["", repo.fullName];

                return (
                  <li
                    key={repo.id}
                    className="animate-in fade-in-0 slide-in-from-left-1 fill-mode-both"
                    style={{ animationDelay: `${Math.min(index, 12) * 22}ms`, animationDuration: "260ms" }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(repo)}
                      className={cn(
                        "group relative w-full rounded-lg px-2.5 py-2 text-left transition-colors duration-150",
                        isSelected
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/55",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-200",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full ring-2 ring-sidebar/40"
                          style={{ backgroundColor: languageColor(repo.language) }}
                          aria-hidden
                        />
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                          <span className="text-muted-foreground/80">{owner}/</span>
                          <span className="text-foreground">{name}</span>
                        </p>
                        {repo.private ? (
                          <Lock className="size-3 shrink-0 text-muted-foreground/70" aria-label="Private" />
                        ) : (
                          <Globe className="size-3 shrink-0 text-muted-foreground/50" aria-label="Public" />
                        )}
                      </div>
                      {repo.description && (
                        <p className="mt-1 line-clamp-1 pl-[1.125rem] text-xs text-muted-foreground">
                          {repo.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 pl-[1.125rem] text-[11px] text-muted-foreground">
                        {repo.language && <span>{repo.language}</span>}
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Star className="size-3" />
                          {formatCount(repo.stargazersCount)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
