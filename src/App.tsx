import "./App.css";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoginScreen } from "./components/LoginScreen";
import { MainApp } from "./components/MainApp";
import { AuthProvider, useAuth } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";

function AppContent() {
  const { session, initializing } = useAuth();

  if (initializing) {
    return (
      <main className="app-surface flex h-screen flex-col items-center justify-center gap-3">
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Loader2 className="size-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Restoring your session…</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return <MainApp />;
}

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
