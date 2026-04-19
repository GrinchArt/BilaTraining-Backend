import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

const AUTH_STORAGE_KEY = 'bila-training.auth-session';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5175/api';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  displayName: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  displayName: string | null;
}

export type AuthenticatedFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface AuthContextValue {
  apiBaseUrl: string;
  session: AuthSession | null;
  isAuthenticated: boolean;
  login: (request: LoginRequest) => Promise<AuthSession>;
  register: (request: RegisterRequest) => Promise<AuthSession>;
  logout: () => void;
  authenticatedFetch: AuthenticatedFetch;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as Partial<AuthSession>;

    if (!session.accessToken || !session.refreshToken || !session.userId || !session.email) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return session as AuthSession;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

async function postJson<TRequest, TResponse>(path: string, payload: TRequest): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'The request failed. Please try again.' }));
    throw { status: response.status, error };
  }

  return (await response.json()) as TResponse;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const sessionRef = useRef<AuthSession | null>(session);
  const refreshPromiseRef = useRef<Promise<AuthSession | null> | null>(null);

  const persistSession = useCallback((nextSession: AuthSession) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    return nextSession;
  }, []);

  const clearSession = useCallback(() => {
    sessionRef.current = null;
    setSession(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const refreshSession = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const currentSession = sessionRef.current;

    if (!currentSession?.refreshToken) {
      clearSession();
      return null;
    }

    const refreshPromise = postJson<{ refreshToken: string }, AuthResponse>('/auth/refresh', {
      refreshToken: currentSession.refreshToken,
    })
      .then((response) => persistSession(response))
      .catch(() => {
        clearSession();
        return null;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [clearSession, persistSession]);

  const authenticatedFetch = useCallback<AuthenticatedFetch>(
    async (input, init) => {
      const send = async (accessToken: string | null | undefined) => {
        const headers = new Headers(init?.headers);

        if (accessToken) {
          headers.set('Authorization', `Bearer ${accessToken}`);
        }

        return fetch(input, {
          ...init,
          headers,
        });
      };

      let response = await send(sessionRef.current?.accessToken);
      if (response.status !== 401) {
        return response;
      }

      const nextSession = await refreshSession();
      if (!nextSession) {
        return response;
      }

      response = await send(nextSession.accessToken);
      return response;
    },
    [refreshSession],
  );

  const login = useCallback(
    async (request: LoginRequest) => {
      const response = await postJson<LoginRequest, AuthResponse>('/auth/login', request);
      return persistSession(response);
    },
    [persistSession],
  );

  const register = useCallback(
    async (request: RegisterRequest) => {
      const response = await postJson<RegisterRequest, AuthResponse>('/auth/register', request);
      return persistSession(response);
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    const currentSession = sessionRef.current;

    if (currentSession?.refreshToken) {
      void fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.accessToken}`,
        },
        body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
      }).catch(() => undefined);
    }

    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      apiBaseUrl: API_BASE_URL,
      session,
      isAuthenticated: session !== null,
      login,
      register,
      logout,
      authenticatedFetch,
    }),
    [authenticatedFetch, login, logout, register, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return value;
}
