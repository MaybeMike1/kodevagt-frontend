import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

export const MAX_HIGHLIGHT_BYTES = 500 * 1024;

const SYNTAX_STYLE = {
  margin: 0,
  padding: "1rem",
  background: "transparent",
  fontSize: "0.75rem",
  lineHeight: 1.625,
} as const;

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  rs: "rust",
  py: "python",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  html: "markup",
  htm: "markup",
  xml: "xml",
  svg: "markup",
  yaml: "yaml",
  yml: "yaml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  sql: "sql",
  go: "go",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  rb: "ruby",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  kts: "kotlin",
  toml: "toml",
  graphql: "graphql",
  gql: "graphql",
  vue: "markup",
  svelte: "markup",
  lua: "lua",
  r: "r",
  dart: "dart",
  ex: "elixir",
  exs: "elixir",
  hs: "haskell",
  tf: "hcl",
  hcl: "hcl",
  ini: "ini",
  diff: "diff",
  patch: "diff",
  md: "markdown",
  markdown: "markdown",
  dockerfile: "docker",
};

export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

export function languageFromPath(path: string): string | null {
  const baseName = path.split("/").pop()?.toLowerCase() ?? "";
  if (baseName === "dockerfile") {
    return "docker";
  }

  const ext = baseName.includes(".") ? baseName.split(".").pop()?.toLowerCase() : null;
  if (!ext) return null;
  return EXTENSION_LANGUAGE_MAP[ext] ?? null;
}

function renderCodeBlock(language: string, code: string, compact = false) {
  return (
    <SyntaxHighlighter
      language={language}
      style={vscDarkPlus}
      customStyle={{
        ...SYNTAX_STYLE,
        padding: compact ? "0.75rem" : SYNTAX_STYLE.padding,
        borderRadius: "0.375rem",
      }}
      PreTag="div"
      wrapLongLines
    >
      {code}
    </SyntaxHighlighter>
  );
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-6 border-b border-border pb-2 text-2xl font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-6 border-b border-border/60 pb-1.5 text-xl font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-semibold first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="mb-4 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-6 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-2 border-muted-foreground/40 pl-4 italic text-muted-foreground last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-t border-border px-3 py-2">{children}</td>,
  pre: ({ children }) => <pre className="mb-4 overflow-x-auto last:mb-0">{children}</pre>,
  code: ({ className, children }) => {
    const match = /language-(\w+)/.exec(className ?? "");
    const code = String(children).replace(/\n$/, "");

    if (match) {
      return renderCodeBlock(match[1], code, true);
    }

    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>
    );
  },
};

type FileContentViewerProps = {
  path: string;
  content: string;
  size: number;
  className?: string;
  header?: ReactNode;
};

function LargeFileNotice() {
  return (
    <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
      Syntax highlighting disabled for files larger than 500 KB
    </div>
  );
}

function PlainTextContent({ content }: { content: string }) {
  return (
    <pre className="whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-foreground/90">{content}</pre>
  );
}

export function FileContentViewer({ path, content, size, className, header }: FileContentViewerProps) {
  const skipHighlight = size > MAX_HIGHLIGHT_BYTES;
  const language = languageFromPath(path);

  if (content.length === 0) {
    return (
      <div className={cn(className)}>
        {header}
        <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">This file is empty</div>
      </div>
    );
  }

  if (isMarkdownPath(path)) {
    return (
      <div className={cn(className)}>
        {header}
        <div className="p-4 text-sm text-foreground/90">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  if (skipHighlight || !language) {
    return (
      <div className={cn(className)}>
        {header}
        {skipHighlight && <LargeFileNotice />}
        <PlainTextContent content={content} />
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      {header}
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={SYNTAX_STYLE}
        showLineNumbers
        wrapLongLines
        PreTag="div"
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
}
