import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Session } from "./types";

type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  isLoggingIn: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeSession(raw: Session | null): Session | null {
  if (!raw) return null;
  const token =
    raw.accessToken ??
    (raw as Session & { access_token?: string }).access_token;
  if (!token) return null;
  return { ...raw, accessToken: token };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const current = normalizeSession(await invoke<Session | null>("get_session"));
    setSession(current);
  }, []);

  useEffect(() => {
    refresh().finally(() => setInitializing(false));
  }, [refresh]);

  useEffect(() => {
    const unlistenSuccess = listen<Session>("auth://success", (event) => {
      setSession(normalizeSession(event.payload));
      setError(null);
      setIsLoggingIn(false);
    });

    const unlistenError = listen<string>("auth://error", (event) => {
      setError(event.payload);
      setIsLoggingIn(false);
    });

    return () => {
      unlistenSuccess.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const window = getCurrentWindow();
    const unlisten = window.onFocusChanged(({ payload: focused }) => {
      if (focused && isLoggingIn) {
        void (async () => {
          const current = normalizeSession(await invoke<Session | null>("get_session"));
          if (current) {
            setSession(current);
            setIsLoggingIn(false);
            setError(null);
          }
        })();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [isLoggingIn, refresh]);

  const login = useCallback(async () => {
    setError(null);
    setIsLoggingIn(true);
    try {
      await invoke("start_github_login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await invoke("logout");
    setSession(null);
    setError(null);
    setIsLoggingIn(false);
  }, []);

  const value = useMemo(
    () => ({
      session,
      initializing,
      isLoggingIn,
      error,
      login,
      logout,
      refresh,
    }),
    [session, initializing, isLoggingIn, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
