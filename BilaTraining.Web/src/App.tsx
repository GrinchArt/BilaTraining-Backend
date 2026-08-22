import { useState, type FormEvent } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';

import { AppShell } from './app/AppShell';
import { AnonymousOnlyRoute, ClientRoute, ProtectedRoute, TrainerRoute } from './app/RouteGuards';
import { CLIENT_ROLE, TRAINER_ROLE, useAuth } from './auth';
import { CalendarDayPage as CalendarDayRoutePage } from './features/calendar/CalendarDayPage';
import { CalendarPage as CalendarRoutePage } from './features/calendar/CalendarPage';
import { CalendarSessionFormPage as CalendarSessionRoutePage } from './features/calendar/CalendarSessionFormPage';
import { ClientFormPage, ClientsPage as ClientsRoutePage } from './features/clients/ClientsPage';
import { ClientDashboardPage } from './features/dashboard/ClientDashboardPage';
import { ExerciseFormPage, ExercisesPage as ExercisesRoutePage } from './features/exercises/ExercisesPage';
import { InvitationPage } from './features/invitations/InvitationPage';
import { BodyMeasurementsPage } from './features/measurements/BodyMeasurementsPage';
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
        <Route path="join/:token" element={<InvitationPage />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <ClientDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="measurements"
          element={
            <ClientRoute>
              <BodyMeasurementsPage />
            </ClientRoute>
          }
        />
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
            <TrainerRoute>
              <ClientsRoutePage />
            </TrainerRoute>
          }
        />
        <Route
          path="clients/new"
          element={
            <TrainerRoute>
              <ClientFormPage mode="create" />
            </TrainerRoute>
          }
        />
        <Route
          path="clients/:clientId/edit"
          element={
            <TrainerRoute>
              <ClientFormPage mode="edit" />
            </TrainerRoute>
          }
        />
        <Route
          path="clients/:clientId/measurements"
          element={
            <TrainerRoute>
              <BodyMeasurementsPage />
            </TrainerRoute>
          }
        />
        <Route
          path="workspaces"
          element={
            <TrainerRoute>
              <WorkspacesRoutePage />
            </TrainerRoute>
          }
        />
        <Route
          path="workspaces/new"
          element={
            <TrainerRoute>
              <WorkspaceFormPage mode="create" />
            </TrainerRoute>
          }
        />
        <Route
          path="workspaces/:workspaceId/edit"
          element={
            <TrainerRoute>
              <WorkspaceFormPage mode="edit" />
            </TrainerRoute>
          }
        />
        <Route
          path="exercises"
          element={
            <TrainerRoute>
              <ExercisesRoutePage />
            </TrainerRoute>
          }
        />
        <Route
          path="exercises/new"
          element={
            <TrainerRoute>
              <ExerciseFormPage mode="create" />
            </TrainerRoute>
          }
        />
        <Route
          path="exercises/:exerciseId/edit"
          element={
            <TrainerRoute>
              <ExerciseFormPage mode="edit" />
            </TrainerRoute>
          }
        />
        <Route
          path="sessions"
          element={
            <TrainerRoute>
              <SessionsRoutePage />
            </TrainerRoute>
          }
        />
        <Route
          path="sessions/new"
          element={
            <TrainerRoute>
              <SessionFormPage mode="create" />
            </TrainerRoute>
          }
        />
        <Route
          path="sessions/:sessionId/edit"
          element={
            <TrainerRoute>
              <SessionFormPage mode="edit" />
            </TrainerRoute>
          }
        />
        <Route
          path="calendar"
          element={
            <TrainerRoute>
              <CalendarRoutePage />
            </TrainerRoute>
          }
        />
        <Route
          path="calendar/day/:dayKey"
          element={
            <TrainerRoute>
              <CalendarDayRoutePage />
            </TrainerRoute>
          }
        />
        <Route
          path="calendar/day/:dayKey/session/new"
          element={
            <TrainerRoute>
              <CalendarSessionRoutePage mode="create" />
            </TrainerRoute>
          }
        />
        <Route
          path="calendar/day/:dayKey/session/:sessionId"
          element={
            <TrainerRoute>
              <CalendarSessionRoutePage mode="edit" />
            </TrainerRoute>
          }
        />
        <Route
          path="calendar/day/:dayKey/session/:sessionId/tracking"
          element={
            <TrainerRoute>
              <SessionTrackingRoutePage />
            </TrainerRoute>
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
            <TrainerRoute>
              <ReportsRoutePage />
            </TrainerRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LandingPage() {
  const { isAuthenticated, session } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;

  const isTrainer = session?.roles.includes(TRAINER_ROLE) ?? false;
  const isClient = session?.roles.includes(CLIENT_ROLE) ?? false;
  return <Navigate to={isTrainer ? '/calendar' : isClient ? '/dashboard' : '/profile'} replace />;
}

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
      await login({
        email: email.trim(),
        password,
        invitationToken: readInvitationToken(searchParams.get('returnTo')),
      });
      navigate(readSafeReturnTo(searchParams.get('returnTo')) ?? '/');
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
        <NavLink
          to={`/auth/register${searchParams.get('returnTo') ? `?returnTo=${encodeURIComponent(searchParams.get('returnTo')!)}` : ''}`}
          className="switch-link"
        >
          {t('auth.createAccountLink')}
        </NavLink>
      </p>
    </section>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
        invitationToken: readInvitationToken(searchParams.get('returnTo')),
      });
      navigate(readSafeReturnTo(searchParams.get('returnTo')) ?? '/');
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
        <NavLink
          to={`/auth/login${searchParams.get('returnTo') ? `?returnTo=${encodeURIComponent(searchParams.get('returnTo')!)}` : ''}`}
          className="switch-link"
        >
          {t('auth.goToLogin')}
        </NavLink>
      </p>
    </section>
  );
}

export default App;

function readSafeReturnTo(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : null;
}

function readInvitationToken(returnTo: string | null) {
  const safeReturnTo = readSafeReturnTo(returnTo);
  const match = safeReturnTo?.match(/^\/join\/([^/?#]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}



