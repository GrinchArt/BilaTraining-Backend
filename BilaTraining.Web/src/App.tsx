import { useState, type FormEvent } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import { AppShell } from './app/AppShell';
import { AnonymousOnlyRoute, ProtectedRoute } from './app/RouteGuards';
import { useAuth } from './auth';
import { CalendarDayPage as CalendarDayRoutePage } from './features/calendar/CalendarDayPage';
import { CalendarPage as CalendarRoutePage } from './features/calendar/CalendarPage';
import { CalendarSessionFormPage as CalendarSessionRoutePage } from './features/calendar/CalendarSessionFormPage';
import { ClientsPage as ClientsRoutePage } from './features/clients/ClientsPage';
import { ExercisesPage as ExercisesRoutePage } from './features/exercises/ExercisesPage';
import { SessionsPage as SessionsRoutePage } from './features/sessions/SessionsPage';
import { WorkspacesPage as WorkspacesRoutePage } from './features/workspaces/WorkspacesPage';
import { toMessage } from './shared/api';

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route
          path="auth/login"
          element={
            <AnonymousOnlyRoute>
              <LoginPage />
            </AnonymousOnlyRoute>
          }
        />
        <Route
          path="auth/register"
          element={
            <AnonymousOnlyRoute>
              <RegisterPage />
            </AnonymousOnlyRoute>
          }
        />
        <Route
          path="clients"
          element={
            <ProtectedRoute>
              <ClientsRoutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="workspaces"
          element={
            <ProtectedRoute>
              <WorkspacesRoutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="exercises"
          element={
            <ProtectedRoute>
              <ExercisesRoutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sessions"
          element={
            <ProtectedRoute>
              <SessionsRoutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="calendar"
          element={
            <ProtectedRoute>
              <CalendarRoutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="calendar/day/:dayKey"
          element={
            <ProtectedRoute>
              <CalendarDayRoutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="calendar/day/:dayKey/session/new"
          element={
            <ProtectedRoute>
              <CalendarSessionRoutePage mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="calendar/day/:dayKey/session/:sessionId"
          element={
            <ProtectedRoute>
              <CalendarSessionRoutePage mode="edit" />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function HomePage() {
  const { apiBaseUrl, isAuthenticated, session } = useAuth();
  const identityLabel = session?.displayName ?? session?.email ?? 'your account';

  return (
    <>
      <section className="card">
        <p className="kicker">Phase 1</p>
        <h2>React foundation is ready</h2>
        {isAuthenticated ? (
          <p>
            You are signed in as <strong>{identityLabel}</strong>. The next step is connecting your first protected
            feature screen.
          </p>
        ) : (
          <p>This app is now structured for a mobile-first React frontend with a dedicated API base URL and working auth flow.</p>
        )}
      </section>

      <section className="card card--muted">
        {isAuthenticated ? (
          <>
            <h3>Next up</h3>
            <ul>
              <li>Connect workspaces or clients against the protected API</li>
              <li>Handle token expiration and API error states</li>
              <li>Start replacing placeholder screens with real flows</li>
            </ul>
          </>
        ) : (
          <>
            <h3>Try the auth flow</h3>
            <p>Register a local account or log in with one you already created in the API.</p>
            <div className="actions">
              <NavLink to="/auth/register" className="action-link">
                Create account
              </NavLink>
              <NavLink to="/auth/login" className="action-link action-link--secondary">
                Login
              </NavLink>
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h3>Current API target</h3>
        <code>{apiBaseUrl}</code>
      </section>
    </>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage('Enter a valid email address and password.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate('/');
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card auth-card">
      <p className="kicker">Auth</p>
      <h2>Login</h2>
      <p>Use the same account you already tested through Postman.</p>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

        <button className="submit-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Login'}
        </button>
      </form>

      <p className="hint">
        Need an account?{' '}
        <NavLink to="/auth/register" className="switch-link">
          Create one here
        </NavLink>
      </p>
    </section>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || password.length < 6 || !/\d/.test(password)) {
      setErrorMessage('Use a valid email and a password with at least 6 characters and one number.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await register({
        email: email.trim(),
        password,
        displayName: displayName.trim() || null,
      });
      navigate('/');
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card auth-card">
      <p className="kicker">Auth</p>
      <h2>Register</h2>
      <p>Create a local account backed by ASP.NET Core Identity.</p>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="register-displayName">Display name</label>
          <input
            id="register-displayName"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

        <button className="submit-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="hint">
        Already registered?{' '}
        <NavLink to="/auth/login" className="switch-link">
          Go to login
        </NavLink>
      </p>
    </section>
  );
}

export default App;



