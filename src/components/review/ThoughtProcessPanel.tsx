import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

type ThoughtProcessPanelProps = {
  thoughtProcess: string;
};

export function ThoughtProcessPanel({ thoughtProcess }: ThoughtProcessPanelProps) {
  if (!thoughtProcess.trim()) return null;

  return (
    <details className="rounded-lg border border-border bg-muted/20">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        Show reasoning
      </summary>
      <div className="border-t border-border px-4 py-3 prose prose-invert max-w-none text-sm text-foreground/90">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {thoughtProcess}
        </ReactMarkdown>
      </div>
    </details>
  );
}
