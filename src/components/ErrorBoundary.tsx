import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Catches render-time errors so a single failing component shows a recoverable
 * message instead of unmounting the whole app into a blank screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="app-surface flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="relative z-10 flex max-w-md flex-col items-center gap-3">
          <h1 className="text-lg font-semibold">Something broke</h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error stopped the view from rendering. You can try again — your
            session is still active.
          </p>
          <pre className="max-h-40 w-full overflow-auto rounded-lg bg-muted/40 p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
          <Button type="button" onClick={this.handleReset}>
            <RotateCw className="size-4" />
            Try again
          </Button>
        </div>
      </main>
    );
  }
}
