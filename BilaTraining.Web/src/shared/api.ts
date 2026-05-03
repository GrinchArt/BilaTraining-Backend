import type { AuthenticatedFetch } from '../auth';

type AuthError = {
  status?: number;
  error?: {
    message?: string;
    errors?: string[];
  };
};

export function toMessage(error: unknown): string {
  const authError = error as AuthError;

  if (authError?.error?.message) {
    return authError.error.message;
  }

  if (Array.isArray(authError?.error?.errors) && authError.error.errors.length > 0) {
    return authError.error.errors.join(' ');
  }

  if (authError?.status === 0 || error instanceof TypeError) {
    return 'The API is unreachable. Make sure the backend is running and CORS is enabled.';
  }

  return 'The request failed. Please review the form and try again.';
}

function createAuthHeaders(accessToken: string | null | undefined, includeJson = false): HeadersInit {
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function readError(response: Response, fallbackMessage: string) {
  const error = await response.json().catch(() => ({ message: fallbackMessage }));
  throw { status: response.status, error };
}

export async function getJson<T>(url: string, authenticatedFetch: AuthenticatedFetch, fallbackMessage: string): Promise<T> {
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    await readError(response, fallbackMessage);
  }

  return (await response.json()) as T;
}

export async function sendJson<TResponse>(
  url: string,
  method: 'POST' | 'PUT',
  authenticatedFetch: AuthenticatedFetch,
  payload: unknown,
  fallbackMessage: string,
): Promise<TResponse | null> {
  const response = await authenticatedFetch(url, {
    method,
    headers: createAuthHeaders(undefined, true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await readError(response, fallbackMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return (await response.json()) as TResponse;
}

export async function sendPatch(
  url: string,
  authenticatedFetch: AuthenticatedFetch,
  payload: unknown,
  fallbackMessage: string,
): Promise<void> {
  const response = await authenticatedFetch(url, {
    method: 'PATCH',
    headers: createAuthHeaders(undefined, true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await readError(response, fallbackMessage);
  }
}

export async function sendVoid(
  url: string,
  method: 'DELETE',
  authenticatedFetch: AuthenticatedFetch,
  fallbackMessage: string,
): Promise<void> {
  const response = await authenticatedFetch(url, {
    method,
  });

  if (!response.ok) {
    await readError(response, fallbackMessage);
  }
}
