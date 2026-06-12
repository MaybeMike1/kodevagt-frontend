import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, File, FileText, Folder } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFileContent, fetchRepoContents, fileContentFromEntry } from "@/lib/github";
import type { ContentItem, FileContent } from "@/lib/types";
import { FileContentViewer } from "@/components/layout/FileContentViewer";
import { cn } from "@/lib/utils";

type RepoSourceCodeProps = {
  owner: string;
  repo: string;
  defaultBranch: string;
  initialRootContents?: ContentItem[];
  readmePreview?: FileContent | null;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function pathSegments(path: string): string[] {
  if (!path) return [];
  return path.split("/");
}

function parentPath(path: string): string {
  const segments = pathSegments(path);
  segments.pop();
  return segments.join("/");
}

type ContentRowProps = {
  item: ContentItem;
  selected: boolean;
  onOpen: (item: ContentItem) => void;
};

function ContentRow({ item, selected, onOpen }: ContentRowProps) {
  const Icon = item.type === "dir" ? Folder : File;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
          selected
            ? "bg-primary/10 text-foreground"
            : "hover:bg-muted/60",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0 transition-colors",
            item.type === "dir"
              ? "fill-amber-500/20 text-amber-500 dark:text-amber-400"
              : selected
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        <span className="truncate font-mono text-xs">{item.name}</span>
        {item.type === "file" && item.size > 0 && (
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
            {formatSize(item.size)}
          </span>
        )}
        {item.type === "dir" && (
          <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
        )}
      </button>
    </li>
  );
}

export function RepoSourceCode({
  owner,
  repo,
  defaultBranch,
  initialRootContents,
  readmePreview,
}: RepoSourceCodeProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<ContentItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const repoKey = `${owner}/${repo}`;
  const rootSeededRef = useRef(false);

  useEffect(() => {
    setCurrentPath("");
    setEntries([]);
    setSelectedFile(null);
    setSelectedPath(null);
    setListError(null);
    setFileError(null);
    setListLoading(true);
    rootSeededRef.current = false;
  }, [repoKey, defaultBranch]);

  const loadDirectory = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setEntries([]);

    try {
      const result = await fetchRepoContents(owner, repo, currentPath, defaultBranch);
      if (result.kind === "file") {
        const file = fileContentFromEntry(result.file);
        setEntries([]);
        setSelectedPath(file.path);
        setSelectedFile(file);
        return;
      }
      setEntries(result.items);
    } catch (err) {
      setEntries([]);
      setListError(err instanceof Error ? err.message : "Failed to load directory");
    } finally {
      setListLoading(false);
    }
  }, [owner, repo, currentPath, defaultBranch]);

  useEffect(() => {
    if (
      currentPath === "" &&
      initialRootContents &&
      initialRootContents.length > 0 &&
      !rootSeededRef.current
    ) {
      rootSeededRef.current = true;
      setEntries(initialRootContents);
      setListLoading(false);
      setListError(null);
      return;
    }

    void loadDirectory();
  }, [loadDirectory, currentPath, initialRootContents]);

  const openFile = useCallback(
    async (path: string) => {
      setSelectedPath(path);
      setFileLoading(true);
      setFileError(null);
      setSelectedFile(null);

      try {
        const content = await fetchFileContent(owner, repo, path, defaultBranch);
        setSelectedFile(content);
      } catch (err) {
        setFileError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setFileLoading(false);
      }
    },
    [owner, repo, defaultBranch],
  );

  const handleOpenItem = useCallback(
    (item: ContentItem) => {
      if (item.type === "dir") {
        setCurrentPath(item.path);
        setSelectedPath(null);
        setSelectedFile(null);
        setFileError(null);
        return;
      }
      void openFile(item.path);
    },
    [openFile],
  );

  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path);
    setSelectedPath(null);
    setSelectedFile(null);
    setFileError(null);
  }, []);

  const segments = pathSegments(currentPath);
  const canGoBack = currentPath.length > 0;
  const showReadmePreview =
    !selectedFile && !fileLoading && !fileError && currentPath === "" && readmePreview != null;

  if (listError && !listLoading && entries.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load source files</AlertTitle>
        <AlertDescription>{listError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex min-h-[28rem] flex-col gap-4 lg:flex-row">
      <Card size="sm" className="flex min-h-0 flex-1 flex-col lg:max-w-sm">
        <CardHeader className="gap-2 pb-2">
          <div className="flex items-center gap-1">
            {canGoBack && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Go to parent folder"
                onClick={() => navigateTo(parentPath(currentPath))}
              >
                <ChevronLeft className="size-4" />
              </Button>
            )}
            <CardTitle className="text-base">Browse</CardTitle>
          </div>
          <CardDescription>
            Branch{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{defaultBranch}</code>
          </CardDescription>
          <nav aria-label="Path breadcrumbs" className="flex flex-wrap items-center gap-0.5 text-xs">
            <button
              type="button"
              onClick={() => navigateTo("")}
              className={cn(
                "rounded px-1 py-0.5 font-mono hover:bg-muted",
                !currentPath && "font-medium text-foreground",
              )}
            >
              {owner}/{repo}
            </button>
            {segments.map((segment, index) => {
              const path = segments.slice(0, index + 1).join("/");
              const isLast = index === segments.length - 1;
              return (
                <span key={path} className="flex items-center gap-0.5">
                  <ChevronRight className="size-3 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => navigateTo(path)}
                    className={cn(
                      "rounded px-1 py-0.5 font-mono hover:bg-muted",
                      isLast && "font-medium text-foreground",
                    )}
                  >
                    {segment}
                  </button>
                </span>
              );
            })}
          </nav>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 pt-0">
          {listLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 text-center">
              <Folder className="mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Empty folder</p>
            </div>
          ) : (
            <ScrollArea className="h-64 rounded-lg border border-border bg-background/40 lg:h-[calc(28rem-8rem)]">
              <ul className="space-y-0.5 p-1.5">
                {entries.map((item) => (
                  <ContentRow
                    key={item.sha}
                    item={item}
                    selected={selectedPath === item.path}
                    onOpen={handleOpenItem}
                  />
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card size="sm" className="flex min-h-0 min-w-0 flex-1 flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="truncate font-mono text-sm">
            {selectedFile?.name ?? (showReadmePreview ? readmePreview.name : "Select a file")}
          </CardTitle>
          {(selectedFile || showReadmePreview) && (
            <CardDescription className="truncate font-mono text-[11px]">
              {(selectedFile ?? readmePreview)!.path} · {formatSize((selectedFile ?? readmePreview)!.size)}
              {showReadmePreview && " · README preview"}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="min-h-0 flex-1 pt-0">
          {fileLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : fileError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load file</AlertTitle>
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          ) : selectedFile ? (
            <ScrollArea className="h-64 rounded-lg border border-border bg-muted/30 lg:h-[calc(28rem-6rem)]">
              <FileContentViewer
                path={selectedFile.path}
                content={selectedFile.text}
                size={selectedFile.size}
              />
            </ScrollArea>
          ) : showReadmePreview ? (
            <ScrollArea className="h-64 rounded-lg border border-border bg-muted/30 lg:h-[calc(28rem-6rem)]">
              <FileContentViewer
                path={readmePreview.path}
                content={readmePreview.text}
                size={readmePreview.size}
                header={
                  <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
                    <FileText className="size-3.5" />
                    README preview
                  </div>
                }
              />
            </ScrollArea>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground lg:h-[calc(28rem-6rem)]">
              <FileText className="size-7 text-muted-foreground/40" />
              Select a file to preview its contents
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
