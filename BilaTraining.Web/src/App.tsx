import { useState, type FormEvent } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import { AppShell } from './app/AppShell';
import { AnonymousOnlyRoute, ProtectedRoute } from './app/RouteGuards';
import { useAuth } from './auth';
import { CalendarDayPage as CalendarDayRoutePage } from './features/calendar/CalendarDayPage';
import { CalendarPage as CalendarRoutePage } from './features/calendar/CalendarPage';
import { CalendarSessionFormPage as CalendarSessionRoutePage } from './features/calendar/CalendarSessionFormPage';
import { ClientFormPage, ClientsPage as ClientsRoutePage } from './features/clients/ClientsPage';
import { ExerciseFormPage, ExercisesPage as ExercisesRoutePage } from './features/exercises/ExercisesPage';
import { ProfilePage as ProfileRoutePage } from './features/profile/ProfilePage';
import { ReportsPage as ReportsRoutePage } from './features/reports/ReportsPage';
import { SessionFormPage, SessionsPage as SessionsRoutePage } from './features/sessions/SessionsPage';
import { SessionTrackingPage as SessionTrackingRoutePage } from './features/sessions/SessionTrackingPage';
import { WorkspaceFormPage, WorkspacesPage as WorkspacesRoutePage } from './features/workspaces/WorkspacesPage';
import { useI18n } from './i18n';
import { toMessage } from './shared/api';

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
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
          path="clients/new"
          element={
            <ProtectedRoute>
              <ClientFormPage mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/:clientId/edit"
          element={
            <ProtectedRoute>
              <ClientFormPage mode="edit" />
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
          path="workspaces/new"
          element={
            <ProtectedRoute>
              <WorkspaceFormPage mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="workspaces/:workspaceId/edit"
          element={
            <ProtectedRoute>
              <WorkspaceFormPage mode="edit" />
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
          path="exercises/new"
          element={
            <ProtectedRoute>
              <ExerciseFormPage mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="exercises/:exerciseId/edit"
          element={
            <ProtectedRoute>
              <ExerciseFormPage mode="edit" />
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
          path="sessions/new"
          element={
            <ProtectedRoute>
              <SessionFormPage mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="sessions/:sessionId/edit"
          element={
            <ProtectedRoute>
              <SessionFormPage mode="edit" />
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
        <Route
          path="calendar/day/:dayKey/session/:sessionId/tracking"
          element={
            <ProtectedRoute>
              <SessionTrackingRoutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfileRoutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute>
              <ReportsRoutePage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LandingPage() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/calendar' : '/auth/login'} replace />;
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage(t('auth.loginValidation'));
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
      <p className="kicker">{t('auth.eyebrow')}</p>
      <h2>{t('auth.loginTitle')}</h2>
      <p>{t('auth.loginDescription')}</p>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="login-email">{t('common.email')}</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">{t('auth.password')}</label>
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
          {isSubmitting ? t('auth.loginSubmitting') : t('auth.loginSubmit')}
        </button>
      </form>

      <p className="hint">
        {t('auth.needAccount')}{' '}
        <NavLink to="/auth/register" className="switch-link">
          {t('auth.createAccountLink')}
        </NavLink>
      </p>
    </section>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || password.length < 6 || !/\d/.test(password)) {
      setErrorMessage(t('auth.registerValidation'));
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
      <p className="kicker">{t('auth.eyebrow')}</p>
      <h2>{t('auth.registerTitle')}</h2>
      <p>{t('auth.registerDescription')}</p>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="register-displayName">{t('auth.displayName')}</label>
          <input
            id="register-displayName"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="register-email">{t('common.email')}</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="register-password">{t('auth.password')}</label>
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
          {isSubmitting ? t('auth.registerSubmitting') : t('auth.registerSubmit')}
        </button>
      </form>

      <p className="hint">
        {t('auth.alreadyRegistered')}{' '}
        <NavLink to="/auth/login" className="switch-link">
          {t('auth.goToLogin')}
        </NavLink>
      </p>
    </section>
  );
}

export default App;



