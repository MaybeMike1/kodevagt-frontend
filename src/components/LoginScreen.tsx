import { Loader2, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "../lib/auth";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5C5.73.5.5 5.73.5 12.01c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.96 10.96 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

const FEATURES = [
  "Browse repositories & source",
  "Review pull requests in-app",
  "AI-assisted code review",
];

export function LoginScreen() {
  const { login, isLoggingIn, error } = useAuth();

  return (
    <main className="app-surface relative flex h-screen items-center justify-center overflow-hidden p-6">
      <div className="relative z-10 w-full max-w-sm animate-in fade-in-0 zoom-in-95 duration-500">
        <div className="surface-card rounded-2xl p-8 shadow-xl">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_8px_24px_-6px_var(--accent-glow),inset_0_1px_0_0_oklch(1_0_0/0.25)]">
              <ShieldCheck className="size-7" strokeWidth={2.25} />
              <span className="absolute inset-0 -z-10 rounded-2xl bg-primary/40 blur-xl" />
            </div>
            <h1 className="text-brand text-2xl font-semibold tracking-tight">Kodevagt</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your GitHub command center for browsing repositories, reviewing pull requests, and
              running AI code reviews — all in one desktop app.
            </p>
          </div>

          <ul className="my-6 space-y-2.5">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <svg viewBox="0 0 24 24" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="3.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-foreground/80">{feature}</span>
              </li>
            ))}
          </ul>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={() => login()}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Waiting for GitHub…
              </>
            ) : (
              <>
                <GitHubMark className="size-4" />
                Continue with GitHub
              </>
            )}
          </Button>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            {isLoggingIn
              ? "Complete sign-in in your browser, then return here. The localhost tab closes automatically."
              : "Authentication opens securely in your system browser."}
          </p>
        </div>
      </div>
    </main>
  );
}
