import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

const AUTH_STORAGE_KEY = 'bila-training.auth-session';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5175/api';

export interface AuthResponse {
  accessToken: string;
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
  userId: string;
  email: string;
  displayName: string | null;
}

interface AuthContextValue {
  apiBaseUrl: string;
  session: AuthSession | null;
  isAuthenticated: boolean;
  login: (request: LoginRequest) => Promise<AuthSession>;
  register: (request: RegisterRequest) => Promise<AuthSession>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
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

  const persistSession = useCallback((nextSession: AuthSession) => {
    setSession(nextSession);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    return nextSession;
  }, []);

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
    setSession(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      apiBaseUrl: API_BASE_URL,
      session,
      isAuthenticated: session !== null,
      login,
      register,
      logout,
    }),
    [login, logout, register, session],
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
