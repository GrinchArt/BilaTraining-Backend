import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { CLIENT_ROLE, TRAINER_ROLE, useAuth } from '../auth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/auth/login" replace />;
}

export function AnonymousOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export function TrainerRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, session } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return session?.roles.includes(TRAINER_ROLE) ? children : <Navigate to="/dashboard" replace />;
}

export function ClientRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, session } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return session?.roles.includes(CLIENT_ROLE) ? children : <Navigate to="/" replace />;
}
