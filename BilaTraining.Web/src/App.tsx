import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { useAuth, type AuthenticatedFetch } from './auth';

type AuthError = {
  status?: number;
  error?: {
    message?: string;
    errors?: string[];
  };
};

type Exercise = {
  id: string;
  name: string;
  category: string | null;
  notes: string | null;
};

type ExerciseFormState = {
  name: string;
  category: string;
  notes: string;
};

type Client = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type ClientFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
};

type Workspace = {
  id: string;
  name: string;
  description: string | null;
  colorHex: string | null;
};

type WorkspaceFormState = {
  name: string;
  description: string;
  colorHex: string;
};

type Session = {
  id: string;
  workspaceId: string;
  clientId: string;
  notes: string | null;
  startAtUtc: string;
  endAtUtc: string;
  status: SessionStatus;
};

type SessionStatus = 0 | 1 | 2 | 3;

type SessionFormState = {
  workspaceId: string;
  clientId: string;
  notes: string;
  startAtLocal: string;
  endAtLocal: string;
  status: SessionStatus;
};

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
              <ClientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="workspaces"
          element={
            <ProtectedRoute>
              <WorkspacesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="exercises"
          element={
            <ProtectedRoute>
              <ExercisesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sessions"
          element={
            <ProtectedRoute>
              <SessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="calendar/day/:dayKey"
          element={
            <ProtectedRoute>
              <CalendarDayPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="calendar/day/:dayKey/session/new"
          element={
            <ProtectedRoute>
              <CalendarSessionFormPage mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="calendar/day/:dayKey/session/:sessionId"
          element={
            <ProtectedRoute>
              <CalendarSessionFormPage mode="edit" />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const identityLabel = useMemo(
    () => session?.displayName ?? session?.email ?? 'Signed in',
    [session?.displayName, session?.email],
  );

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((value) => !value);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/auth/login');
  };

  const navItems = isAuthenticated
    ? [
        { to: '/clients', label: 'Clients' },
        { to: '/workspaces', label: 'Workspaces' },
        { to: '/exercises', label: 'Exercises' },
        { to: '/sessions', label: 'Sessions' },
        { to: '/calendar', label: 'Calendar' },
      ]
    : [
        { to: '/auth/login', label: 'Login' },
        { to: '/auth/register', label: 'Register' },
      ];

  return (
    <div className="shell">
      {menuOpen ? (
        <button type="button" className="shell__scrim" aria-label="Close menu" onClick={closeMenu} />
      ) : null}

      <header className="shell__header">
        <div className="shell__header-row">
          <button
            type="button"
            className={`shell__burger${menuOpen ? ' is-active' : ''}`}
            aria-expanded={menuOpen}
            aria-controls="primary-menu"
            aria-label="Open navigation menu"
            onClick={toggleMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className="shell__header-main">
            <p className="shell__eyebrow">BilaTraining</p>
            <h1>Coach Dashboard</h1>
          </div>
        </div>

        <div className="shell__profile">
          {isAuthenticated ? (
            <>
              <p className="shell__identity">
                <strong>{identityLabel}</strong>
              </p>
              <button type="button" className="shell__logout" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <p className="shell__identity">Not signed in yet</p>
          )}
        </div>
      </header>

      <aside id="primary-menu" className={`shell__drawer${menuOpen ? ' is-open' : ''}`}>
        <div className="shell__drawer-card">
          <p className="shell__drawer-eyebrow">Navigation</p>
          <nav className="shell__drawer-nav" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <main className="shell__content">
        <Outlet />
      </main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/auth/login" replace />;
}

function AnonymousOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
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

function ClientsPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientFormState>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
  });

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await getJson<Client[]>(
        `${apiBaseUrl}/clients${query}`,
        authenticatedFetch,
        'Failed to load clients.',
      );

      setClients(data);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch, search]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      notes: '',
    });
  };

  const handleChange =
    (field: keyof ClientFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setErrorMessage('');
    setForm({
      firstName: client.firstName,
      lastName: client.lastName ?? '',
      phone: client.phone ?? '',
      email: client.email ?? '',
      notes: client.notes ?? '',
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.firstName.trim()) {
      setErrorMessage('First name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingId) {
        await sendJson(
          `${apiBaseUrl}/clients/${editingId}`,
          'PUT',
          authenticatedFetch,
          payload,
          'Failed to update client.',
        );
      } else {
        await sendJson(
          `${apiBaseUrl}/clients`,
          'POST',
          authenticatedFetch,
          payload,
          'Failed to create client.',
        );
      }

      resetForm();
      await loadClients();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    setIsDeletingId(client.id);
    setErrorMessage('');

    try {
        await sendVoid(
          `${apiBaseUrl}/clients/${client.id}`,
          'DELETE',
          authenticatedFetch,
          'Failed to delete client.',
        );

      if (editingId === client.id) {
        resetForm();
      }

      await loadClients();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <section className="exercise-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">Clients</p>
          <h2>Clients</h2>
          <p>Add clients, update their contact details, and filter the list when you are working from a phone.</p>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>{editingId ? 'Edit client' : 'Add client'}</h3>
            {editingId ? (
              <button type="button" className="button button--secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>

          <form className="exercise-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="client-firstName">First name</label>
              <input id="client-firstName" type="text" value={form.firstName} onChange={handleChange('firstName')} />
            </div>

            <div className="field">
              <label htmlFor="client-lastName">Last name</label>
              <input id="client-lastName" type="text" value={form.lastName} onChange={handleChange('lastName')} />
            </div>

            <div className="field">
              <label htmlFor="client-phone">Phone</label>
              <input
                id="client-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange('phone')}
              />
            </div>

            <div className="field">
              <label htmlFor="client-email">Email</label>
              <input
                id="client-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange('email')}
              />
            </div>

            <div className="field">
              <label htmlFor="client-notes">Notes</label>
              <textarea id="client-notes" rows={4} value={form.notes} onChange={handleChange('notes')} />
            </div>

            <button className="submit-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add client'}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="exercise-page__section-header">
            <h3>Client list</h3>
            <span className="exercise-page__count">{clients.length}</span>
          </div>

          <div className="field">
            <label htmlFor="client-search">Search</label>
            <input
              id="client-search"
              type="search"
              placeholder="Name, email, or phone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {isLoading ? <p className="exercise-page__state">Loading clients...</p> : null}

          {!isLoading && clients.length === 0 ? (
            <p className="exercise-page__state">
              {search.trim() ? 'No clients match the current search.' : 'No clients yet.'}
            </p>
          ) : null}

          {!isLoading && clients.length > 0 ? (
            <div className="exercise-list">
              {clients.map((client) => (
                <article key={client.id} className="exercise-item">
                  <div className="exercise-item__content">
                    <div className="exercise-item__title-row">
                      <h4>{formatClientName(client)}</h4>
                    </div>

                    <div className="client-item__meta">
                      <span>{client.phone ?? 'No phone'}</span>
                      <span>{client.email ?? 'No email'}</span>
                    </div>

                    {client.notes ? <p>{client.notes}</p> : <p className="exercise-item__muted">No notes.</p>}
                  </div>

                  <div className="exercise-item__actions">
                    <button type="button" className="button button--secondary" onClick={() => handleEdit(client)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button button--danger"
                      disabled={isDeletingId === client.id}
                      onClick={() => void handleDelete(client)}
                    >
                      {isDeletingId === client.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function WorkspacesPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkspaceFormState>({
    name: '',
    description: '',
    colorHex: '#2575ff',
  });

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await getJson<Workspace[]>(
        `${apiBaseUrl}/workspaces`,
        authenticatedFetch,
        'Failed to load workspaces.',
      );

      setWorkspaces(data);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const filteredWorkspaces = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    if (!normalizedQuery) {
      return workspaces;
    }

    return workspaces.filter((workspace) => workspace.name.toLowerCase().includes(normalizedQuery));
  }, [search, workspaces]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      colorHex: '#2575ff',
    });
  };

  const handleChange =
    (field: keyof WorkspaceFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleEdit = (workspace: Workspace) => {
    setEditingId(workspace.id);
    setErrorMessage('');
    setForm({
      name: workspace.name,
      description: workspace.description ?? '',
      colorHex: normalizeColorHex(workspace.colorHex),
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setErrorMessage('Workspace name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      colorHex: form.colorHex.trim() || null,
    };

    try {
      if (editingId) {
        await sendJson(
          `${apiBaseUrl}/workspaces/${editingId}`,
          'PUT',
          authenticatedFetch,
          payload,
          'Failed to update workspace.',
        );
      } else {
        await sendJson(
          `${apiBaseUrl}/workspaces`,
          'POST',
          authenticatedFetch,
          payload,
          'Failed to create workspace.',
        );
      }

      resetForm();
      await loadWorkspaces();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (workspace: Workspace) => {
    setIsDeletingId(workspace.id);
    setErrorMessage('');

    try {
        await sendVoid(
          `${apiBaseUrl}/workspaces/${workspace.id}`,
          'DELETE',
          authenticatedFetch,
          'Failed to delete workspace.',
        );

      if (editingId === workspace.id) {
        resetForm();
      }

      await loadWorkspaces();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <section className="exercise-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">Workspaces</p>
          <h2>Workspaces</h2>
          <p>Create mobile-friendly training spaces and keep them visually distinct with a color marker.</p>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>{editingId ? 'Edit workspace' : 'Add workspace'}</h3>
            {editingId ? (
              <button type="button" className="button button--secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>

          <form className="exercise-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="workspace-name">Name</label>
              <input id="workspace-name" type="text" value={form.name} onChange={handleChange('name')} />
            </div>

            <div className="field">
              <label htmlFor="workspace-description">Description</label>
              <textarea
                id="workspace-description"
                rows={4}
                value={form.description}
                onChange={handleChange('description')}
              />
            </div>

            <div className="field">
              <label htmlFor="workspace-color">Color</label>
              <div className="workspace-color-field">
                <input
                  id="workspace-color"
                  className="workspace-color-field__picker"
                  type="color"
                  value={normalizeColorHex(form.colorHex)}
                  onChange={handleChange('colorHex')}
                />
                <span className="workspace-color-field__value">{normalizeColorHex(form.colorHex)}</span>
              </div>
            </div>

            <button className="submit-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add workspace'}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="exercise-page__section-header">
            <h3>Workspace list</h3>
            <span className="exercise-page__count">{filteredWorkspaces.length}</span>
          </div>

          <div className="field">
            <label htmlFor="workspace-search">Search by name</label>
            <input
              id="workspace-search"
              type="search"
              placeholder="Start typing a workspace name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {isLoading ? <p className="exercise-page__state">Loading workspaces...</p> : null}

          {!isLoading && filteredWorkspaces.length === 0 ? (
            <p className="exercise-page__state">
              {workspaces.length === 0 ? 'No workspaces yet.' : 'No workspaces match the current search.'}
            </p>
          ) : null}

          {!isLoading && filteredWorkspaces.length > 0 ? (
            <div className="exercise-list">
              {filteredWorkspaces.map((workspace) => (
                <article key={workspace.id} className="exercise-item">
                  <div className="exercise-item__content">
                    <div className="exercise-item__title-row">
                      <span
                        className="workspace-item__swatch"
                        style={{ backgroundColor: normalizeColorHex(workspace.colorHex) }}
                        aria-hidden="true"
                      ></span>
                      <h4>{workspace.name}</h4>
                    </div>
                    {workspace.description ? (
                      <p>{workspace.description}</p>
                    ) : (
                      <p className="exercise-item__muted">No description.</p>
                    )}
                  </div>

                  <div className="exercise-item__actions">
                    <button type="button" className="button button--secondary" onClick={() => handleEdit(workspace)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button button--danger"
                      disabled={isDeletingId === workspace.id}
                      onClick={() => void handleDelete(workspace)}
                    >
                      {isDeletingId === workspace.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function ExercisesPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExerciseFormState>({
    name: '',
    category: '',
    notes: '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadExercises = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await getJson<Exercise[]>(
          `${apiBaseUrl}/exercises`,
          authenticatedFetch,
          'Failed to load exercises.',
        );

        if (isMounted) {
          setExercises(data);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(toMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadExercises();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, authenticatedFetch]);

  const filteredExercises = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    if (!normalizedQuery) {
      return exercises;
    }

    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(normalizedQuery));
  }, [exercises, search]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      category: '',
      notes: '',
    });
  };

  const handleChange =
    (field: keyof ExerciseFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleEdit = (exercise: Exercise) => {
    setEditingId(exercise.id);
    setErrorMessage('');
    setForm({
      name: exercise.name,
      category: exercise.category ?? '',
      notes: exercise.notes ?? '',
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setErrorMessage('Exercise name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      notes: form.notes.trim() || null,
    };

      try {
        if (editingId) {
          await sendJson(
            `${apiBaseUrl}/exercises/${editingId}`,
            'PUT',
            authenticatedFetch,
            payload,
            'Failed to update exercise.',
          );

        setExercises((current) =>
          current
            .map((exercise) =>
              exercise.id === editingId
                ? {
                    ...exercise,
                    name: payload.name,
                    category: payload.category,
                    notes: payload.notes,
                  }
                : exercise,
            )
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
      } else {
          const created = await sendJson<Exercise>(
            `${apiBaseUrl}/exercises`,
            'POST',
            authenticatedFetch,
            payload,
            'Failed to create exercise.',
          );

          if (!created) {
            throw new Error('Failed to create exercise.');
          }
          setExercises((current) => [...current, created].sort((left, right) => left.name.localeCompare(right.name)));
        }

      resetForm();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (exercise: Exercise) => {
    setIsDeletingId(exercise.id);
    setErrorMessage('');

    try {
      await sendVoid(
        `${apiBaseUrl}/exercises/${exercise.id}`,
        'DELETE',
        authenticatedFetch,
        'Failed to delete exercise.',
      );

      setExercises((current) => current.filter((item) => item.id !== exercise.id));

      if (editingId === exercise.id) {
        resetForm();
      }
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <section className="exercise-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">Exercises</p>
          <h2>Exercises</h2>
          <p>Manage your exercise library, update existing entries, and filter it by name.</p>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>{editingId ? 'Edit exercise' : 'Add exercise'}</h3>
            {editingId ? (
              <button type="button" className="button button--secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>

          <form className="exercise-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="exercise-name">Name</label>
              <input id="exercise-name" type="text" value={form.name} onChange={handleChange('name')} />
            </div>

            <div className="field">
              <label htmlFor="exercise-category">Category</label>
              <input id="exercise-category" type="text" value={form.category} onChange={handleChange('category')} />
            </div>

            <div className="field">
              <label htmlFor="exercise-notes">Notes</label>
              <textarea id="exercise-notes" rows={4} value={form.notes} onChange={handleChange('notes')} />
            </div>

            <button className="submit-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add exercise'}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="exercise-page__section-header">
            <h3>Library</h3>
            <span className="exercise-page__count">{filteredExercises.length}</span>
          </div>

          <div className="field">
            <label htmlFor="exercise-search">Search by name</label>
            <input
              id="exercise-search"
              type="search"
              placeholder="Start typing a name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {isLoading ? <p className="exercise-page__state">Loading exercises...</p> : null}

          {!isLoading && filteredExercises.length === 0 ? (
            <p className="exercise-page__state">
              {exercises.length === 0 ? 'No exercises yet.' : 'No exercises match the current search.'}
            </p>
          ) : null}

          {!isLoading && filteredExercises.length > 0 ? (
            <div className="exercise-list">
              {filteredExercises.map((exercise) => (
                <article key={exercise.id} className="exercise-item">
                  <div className="exercise-item__content">
                    <div className="exercise-item__title-row">
                      <h4>{exercise.name}</h4>
                      {exercise.category ? <span className="exercise-item__tag">{exercise.category}</span> : null}
                    </div>
                    {exercise.notes ? <p>{exercise.notes}</p> : <p className="exercise-item__muted">No notes.</p>}
                  </div>

                  <div className="exercise-item__actions">
                    <button type="button" className="button button--secondary" onClick={() => handleEdit(exercise)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button button--danger"
                      disabled={isDeletingId === exercise.id}
                      onClick={() => void handleDelete(exercise)}
                    >
                      {isDeletingId === exercise.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function SessionsPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | `${SessionStatus}`>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState<SessionFormState>({
    workspaceId: '',
    clientId: '',
    notes: '',
    startAtLocal: '',
    endAtLocal: '',
    status: 0,
  });

  const workspaceById = useMemo(
    () => new Map(workspaces.map((workspace) => [workspace.id, workspace])),
    [workspaces],
  );
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  const applySelection = useCallback((session: Session | null) => {
    if (!session) {
      setSelectedId(null);
      setForm({
        workspaceId: '',
        clientId: '',
        notes: '',
        startAtLocal: '',
        endAtLocal: '',
        status: 0,
      });
      return;
    }

    setSelectedId(session.id);
    setForm({
      workspaceId: session.workspaceId,
      clientId: session.clientId,
      notes: session.notes ?? '',
      startAtLocal: toDateTimeLocalValue(session.startAtUtc),
      endAtLocal: toDateTimeLocalValue(session.endAtUtc),
      status: session.status,
    });
  }, []);

  const loadSessionsPage = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [nextSessions, nextClients, nextWorkspaces] = await Promise.all([
        getJson<Session[]>(`${apiBaseUrl}/sessions`, authenticatedFetch, 'Failed to load sessions.'),
        getJson<Client[]>(`${apiBaseUrl}/clients`, authenticatedFetch, 'Failed to load clients.'),
        getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, 'Failed to load workspaces.'),
      ]);

      setSessions(nextSessions);
      setClients(nextClients);
      setWorkspaces(nextWorkspaces);

      setSelectedId((current) => {
        const preferred = current ? nextSessions.find((session) => session.id === current) : null;
        const nextSelected = preferred ?? nextSessions[0] ?? null;
        applySelection(nextSelected);
        return nextSelected?.id ?? null;
      });
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, applySelection, authenticatedFetch]);

  useEffect(() => {
    void loadSessionsPage();
  }, [loadSessionsPage]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return sessions.filter((session) => {
      if (statusFilter !== 'all' && `${session.status}` !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const clientLabel = formatClientName(clientById.get(session.clientId) ?? emptyClient(session.clientId));
      const workspaceLabel = workspaceById.get(session.workspaceId)?.name ?? 'Unknown workspace';
      const statusLabel = sessionStatusLabel(session.status);
      const haystack = [clientLabel, workspaceLabel, statusLabel, session.notes ?? ''].join(' ').toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [clientById, search, sessions, statusFilter, workspaceById]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedId) ?? null,
    [selectedId, sessions],
  );

  const handleFormChange =
    (field: keyof SessionFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = field === 'status' ? Number(event.target.value) : event.target.value;

      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSelectSession = (session: Session) => {
    setErrorMessage('');
    applySelection(session);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSession) {
      setErrorMessage('Choose a session first.');
      return;
    }

    if (!form.workspaceId || !form.clientId || !form.startAtLocal || !form.endAtLocal) {
      setErrorMessage('Workspace, client, start time, and end time are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      await sendJson(
        `${apiBaseUrl}/sessions/${selectedSession.id}`,
        'PUT',
        authenticatedFetch,
        {
          workspaceId: form.workspaceId,
          clientId: form.clientId,
          notes: form.notes.trim() || null,
          startAtUtc: new Date(form.startAtLocal).toISOString(),
          endAtUtc: new Date(form.endAtLocal).toISOString(),
        },
        'Failed to update session.',
      );

      if (selectedSession.status !== form.status) {
        await sendPatch(
          `${apiBaseUrl}/sessions/${selectedSession.id}/status`,
          authenticatedFetch,
          { status: form.status },
          'Failed to update session status.',
        );
      }

      await loadSessionsPage();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (session: Session) => {
    setIsDeletingId(session.id);
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/sessions/${session.id}`, 'DELETE', authenticatedFetch, 'Failed to delete session.');
      await loadSessionsPage();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <section className="exercise-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">Sessions</p>
          <h2>Sessions</h2>
          <p>Review upcoming and past sessions, edit their details, and keep status changes aligned with the calendar.</p>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>Session list</h3>
            <span className="exercise-page__count">{filteredSessions.length}</span>
          </div>

          <div className="field">
            <label htmlFor="session-search">Search</label>
            <input
              id="session-search"
              type="search"
              placeholder="Client, workspace, note, or status"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="session-statusFilter">Status</label>
            <select id="session-statusFilter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | `${SessionStatus}`)}>
              <option value="all">All statuses</option>
              <option value="0">Planned</option>
              <option value="1">Completed</option>
              <option value="2">Cancelled</option>
              <option value="3">No show</option>
            </select>
          </div>

          {isLoading ? <p className="exercise-page__state">Loading sessions...</p> : null}

          {!isLoading && filteredSessions.length === 0 ? (
            <p className="exercise-page__state">No sessions match the current filters.</p>
          ) : null}

          {!isLoading && filteredSessions.length > 0 ? (
            <div className="exercise-list">
              {filteredSessions.map((session) => {
                const client = clientById.get(session.clientId);
                const workspace = workspaceById.get(session.workspaceId);
                const isActive = session.id === selectedId;

                return (
                  <article key={session.id} className="exercise-item">
                    <div className="exercise-item__content">
                      <div className="exercise-item__title-row">
                        <h4>{workspace?.name ?? 'Unknown workspace'}</h4>
                      </div>

                      <div className="client-item__meta">
                        <span>{client ? formatClientName(client) : 'Unknown client'}</span>
                        <span>{sessionStatusLabel(session.status)}</span>
                      </div>

                      <p>{formatSessionWindow(session.startAtUtc, session.endAtUtc)}</p>
                      {session.notes ? <p>{session.notes}</p> : <p className="exercise-item__muted">No notes.</p>}
                    </div>

                    <div className="exercise-item__actions">
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => handleSelectSession(session)}
                      >
                        {isActive ? 'Selected' : 'Open'}
                      </button>
                      <button
                        type="button"
                        className="button button--danger"
                        disabled={isDeletingId === session.id}
                        onClick={() => void handleDelete(session)}
                      >
                        {isDeletingId === session.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="card">
          <div className="exercise-page__section-header">
            <h3>Session details</h3>
          </div>

          {!selectedSession ? (
            <p className="exercise-page__state">Sessions are created from the calendar. Pick one from the list to review or edit it here.</p>
          ) : (
            <form className="exercise-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="session-workspace">Workspace</label>
                <select id="session-workspace" value={form.workspaceId} onChange={handleFormChange('workspaceId')}>
                  <option value="">Choose workspace</option>
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="session-client">Client</label>
                <select id="session-client" value={form.clientId} onChange={handleFormChange('clientId')}>
                  <option value="">Choose client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {formatClientName(client)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="session-start">Start</label>
                <input id="session-start" type="datetime-local" value={form.startAtLocal} onChange={handleFormChange('startAtLocal')} />
              </div>

              <div className="field">
                <label htmlFor="session-end">End</label>
                <input id="session-end" type="datetime-local" value={form.endAtLocal} onChange={handleFormChange('endAtLocal')} />
              </div>

              <div className="field">
                <label htmlFor="session-status">Status</label>
                <select id="session-status" value={form.status} onChange={handleFormChange('status')}>
                  <option value={0}>Planned</option>
                  <option value={1}>Completed</option>
                  <option value={2}>Cancelled</option>
                  <option value={3}>No show</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="session-notes">Notes</label>
                <textarea id="session-notes" rows={5} value={form.notes} onChange={handleFormChange('notes')} />
              </div>

              <button className="submit-button" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}

function CalendarPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const workspaceById = useMemo(() => new Map(workspaces.map((workspace) => [workspace.id, workspace])), [workspaces]);

  const loadCalendar = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [nextSessions, nextClients, nextWorkspaces] = await Promise.all([
        getJson<Session[]>(`${apiBaseUrl}/sessions`, authenticatedFetch, 'Failed to load sessions.'),
        getJson<Client[]>(`${apiBaseUrl}/clients`, authenticatedFetch, 'Failed to load clients.'),
        getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, 'Failed to load workspaces.'),
      ]);

      setSessions(nextSessions);
      setClients(nextClients);
      setWorkspaces(nextWorkspaces);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const monthDays = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, Session[]>();

    for (const session of sessions) {
      const key = toDayKey(new Date(session.startAtUtc));
      const items = map.get(key) ?? [];
      items.push(session);
      map.set(key, items);
    }

    for (const items of map.values()) {
      items.sort((left, right) => new Date(left.startAtUtc).getTime() - new Date(right.startAtUtc).getTime());
    }

    return map;
  }, [sessions]);

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const handlePickDay = (day: Date) => {
    const normalized = startOfDay(day);
    navigate(`/calendar/day/${toDayKey(normalized)}`);
  };

  return (
    <section className="calendar-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">Calendar</p>
          <h2>Calendar</h2>
          <p>Plan the month first. Open a day to see every entry, including overlapping sessions.</p>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <section className="card calendar-board">
        <div className="calendar-board__header">
          <button type="button" className="button button--secondary" onClick={() => moveMonth(-1)}>
            Prev
          </button>
          <div className="calendar-board__title">
            <h3>{visibleMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h3>
            <p>{sessionsByDay.size} active day entries</p>
          </div>
          <button type="button" className="button button--secondary" onClick={() => moveMonth(1)}>
            Next
          </button>
        </div>

        <div className="calendar-board__weekdays">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="calendar-board__days">
          {monthDays.map((day) => {
            const dayKey = toDayKey(day);
            const daySessions = sessionsByDay.get(dayKey) ?? [];
            const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
            const isToday = dayKey === toDayKey(today);

            return (
              <button
                type="button"
                key={dayKey}
                className={`calendar-day${isCurrentMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}`}
                onClick={() => handlePickDay(day)}
              >
                <span className="calendar-day__number">{day.getDate()}</span>
                <div className="calendar-day__items">
                  {daySessions.slice(0, 2).map((session) => {
                    const workspace = workspaceById.get(session.workspaceId);
                    const client = clientById.get(session.clientId);
                    const workspaceColor = normalizeColorHex(workspace?.colorHex);

                    return (
                      <span
                        key={session.id}
                        className={`calendar-chip calendar-chip--${session.status}`}
                        style={{
                          backgroundColor: hexToRgba(workspaceColor, 0.22),
                          borderColor: hexToRgba(workspaceColor, 0.48),
                        }}
                      >
                        <strong>{formatTimeShort(session.startAtUtc)}</strong>
                        <span>{client ? formatClientName(client) : workspace?.name ?? 'Session'}</span>
                      </span>
                    );
                  })}
                  {daySessions.length > 2 ? <span className="calendar-day__more">+{daySessions.length - 2}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function CalendarDayPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const { dayKey } = useParams<{ dayKey: string }>();
  const selectedDay = useMemo(() => parseDayKey(dayKey) ?? startOfDay(new Date()), [dayKey]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const workspaceById = useMemo(() => new Map(workspaces.map((workspace) => [workspace.id, workspace])), [workspaces]);

  const loadDay = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [nextSessions, nextClients, nextWorkspaces] = await Promise.all([
        getJson<Session[]>(`${apiBaseUrl}/sessions`, authenticatedFetch, 'Failed to load sessions.'),
        getJson<Client[]>(`${apiBaseUrl}/clients`, authenticatedFetch, 'Failed to load clients.'),
        getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, 'Failed to load workspaces.'),
      ]);

      setSessions(nextSessions);
      setClients(nextClients);
      setWorkspaces(nextWorkspaces);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  const selectedDaySessions = useMemo(
    () =>
      sessions
        .filter((session) => toDayKey(new Date(session.startAtUtc)) === toDayKey(selectedDay))
        .sort((left, right) => new Date(left.startAtUtc).getTime() - new Date(right.startAtUtc).getTime()),
    [selectedDay, sessions],
  );

  return (
    <section className="calendar-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">Calendar Day</p>
          <h2>{selectedDay.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
          <p>All sessions for this day are listed here, including overlapping ones.</p>
        </div>
        <div className="calendar-toolbar">
          <button type="button" className="button button--secondary" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <button
            type="button"
            className="button"
            aria-label="Add session"
            onClick={() => navigate(`/calendar/day/${toDayKey(selectedDay)}/session/new`)}
          >
            +
          </button>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="calendar-page__grid calendar-page__grid--detail">
        <section className="card calendar-day-panel">
          <div className="exercise-page__section-header">
            <h3>Sessions</h3>
            <span className="exercise-page__count">{selectedDaySessions.length}</span>
          </div>

          {isLoading ? <p className="exercise-page__state">Loading sessions...</p> : null}
          {!isLoading && selectedDaySessions.length === 0 ? (
            <p className="exercise-page__state">No sessions yet. Add the first one for this day.</p>
          ) : null}
          {!isLoading && selectedDaySessions.length > 0 ? (
            <div className="exercise-list">
              {selectedDaySessions.map((session) => {
                const workspace = workspaceById.get(session.workspaceId);
                const client = clientById.get(session.clientId);

                return (
                  <article key={session.id} className="exercise-item">
                    <div className="exercise-item__content">
                      <div className="exercise-item__title-row">
                        <h4>{client ? formatClientName(client) : 'Unknown client'}</h4>
                        <span className={`exercise-item__tag calendar-status-tag calendar-status-tag--${session.status}`}>
                          {sessionStatusLabel(session.status)}
                        </span>
                      </div>
                      <div className="client-item__meta">
                        <span>{workspace?.name ?? 'Unknown workspace'}</span>
                        <span>{formatSessionWindow(session.startAtUtc, session.endAtUtc)}</span>
                      </div>
                      {session.notes ? <p>{session.notes}</p> : <p className="exercise-item__muted">No notes.</p>}
                    </div>
                    <div className="exercise-item__actions">
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => navigate(`/calendar/day/${toDayKey(selectedDay)}/session/${session.id}`)}
                      >
                        Edit
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function CalendarSessionFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const { dayKey, sessionId } = useParams<{ dayKey: string; sessionId: string }>();
  const selectedDay = useMemo(() => parseDayKey(dayKey) ?? startOfDay(new Date()), [dayKey]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState<{
    workspaceId: string;
    clientId: string;
    startAtLocal: string;
    endAtLocal: string;
    notes: string;
    status: SessionStatus;
  }>({
    workspaceId: '',
    clientId: '',
    startAtLocal: combineDayAndTime(selectedDay, '09:00'),
    endAtLocal: combineDayAndTime(selectedDay, '10:00'),
    notes: '',
    status: 0,
  });

  const editingSession = useMemo(
    () => (mode === 'edit' ? sessions.find((session) => session.id === sessionId) ?? null : null),
    [mode, sessionId, sessions],
  );

  const loadFormData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [nextSessions, nextClients, nextWorkspaces] = await Promise.all([
        getJson<Session[]>(`${apiBaseUrl}/sessions`, authenticatedFetch, 'Failed to load sessions.'),
        getJson<Client[]>(`${apiBaseUrl}/clients`, authenticatedFetch, 'Failed to load clients.'),
        getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, 'Failed to load workspaces.'),
      ]);

      setSessions(nextSessions);
      setClients(nextClients);
      setWorkspaces(nextWorkspaces);

      if (mode === 'edit') {
        const session = nextSessions.find((item) => item.id === sessionId);
        if (session) {
          setForm({
            workspaceId: session.workspaceId,
            clientId: session.clientId,
            startAtLocal: toDateTimeLocalValue(session.startAtUtc),
            endAtLocal: toDateTimeLocalValue(session.endAtUtc),
            notes: session.notes ?? '',
            status: session.status,
          });
        }
      } else {
        setForm((current) => ({
          ...current,
          startAtLocal: combineDayAndTime(selectedDay, extractTime(current.startAtLocal) ?? '09:00'),
          endAtLocal: combineDayAndTime(selectedDay, extractTime(current.endAtLocal) ?? '10:00'),
        }));
      }
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch, mode, selectedDay, sessionId]);

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  const handleChange =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = field === 'status' ? Number(event.target.value) : event.target.value;

      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.workspaceId || !form.clientId || !form.startAtLocal || !form.endAtLocal) {
      setErrorMessage('Workspace, client, start time, and end time are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const payload = {
        workspaceId: form.workspaceId,
        clientId: form.clientId,
        notes: form.notes.trim() || null,
        startAtUtc: new Date(form.startAtLocal).toISOString(),
        endAtUtc: new Date(form.endAtLocal).toISOString(),
      };

      if (mode === 'edit' && editingSession) {
        await sendJson(
          `${apiBaseUrl}/sessions/${editingSession.id}`,
          'PUT',
          authenticatedFetch,
          payload,
          'Failed to update session.',
        );

        if (editingSession.status !== form.status) {
          await sendPatch(
            `${apiBaseUrl}/sessions/${editingSession.id}/status`,
            authenticatedFetch,
            { status: form.status },
            'Failed to update session status.',
          );
        }
      } else {
        await sendJson(`${apiBaseUrl}/sessions`, 'POST', authenticatedFetch, payload, 'Failed to create session.');
      }

      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate(`/calendar/day/${toDayKey(selectedDay)}`);
      }
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="calendar-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">Calendar Session</p>
          <h2>{mode === 'edit' ? 'Edit session' : 'Create session'}</h2>
          <p>{selectedDay.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button type="button" className="button button--secondary" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <section className="card calendar-day-panel">
        {isLoading ? (
          <p className="exercise-page__state">Loading form...</p>
        ) : (
          <form className="exercise-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="calendar-workspace">Workspace</label>
              <select id="calendar-workspace" value={form.workspaceId} onChange={handleChange('workspaceId')}>
                <option value="">Choose workspace</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="calendar-client">Client</label>
              <select id="calendar-client" value={form.clientId} onChange={handleChange('clientId')}>
                <option value="">Choose client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {formatClientName(client)}
                  </option>
                ))}
              </select>
            </div>

            <div className="calendar-form__times">
              <div className="field">
                <label htmlFor="calendar-start">Start</label>
                <input id="calendar-start" type="datetime-local" value={form.startAtLocal} onChange={handleChange('startAtLocal')} />
              </div>
              <div className="field">
                <label htmlFor="calendar-end">End</label>
                <input id="calendar-end" type="datetime-local" value={form.endAtLocal} onChange={handleChange('endAtLocal')} />
              </div>
            </div>

            <div className="field">
              <label htmlFor="calendar-status">Status</label>
              <select id="calendar-status" value={form.status} onChange={handleChange('status')}>
                <option value={0}>Planned</option>
                <option value={1}>Completed</option>
                <option value={2}>Cancelled</option>
                <option value={3}>No show</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="calendar-notes">Notes</label>
              <textarea id="calendar-notes" rows={4} value={form.notes} onChange={handleChange('notes')} />
            </div>

            <button className="submit-button" type="submit" disabled={isSaving}>
              {isSaving ? (mode === 'edit' ? 'Saving...' : 'Creating...') : mode === 'edit' ? 'Save changes' : 'Create session'}
            </button>
          </form>
        )}
      </section>
    </section>
  );
}

function FeaturePage(props: {
  eyebrow: string;
  title: string;
  description: string;
  heading: string;
  items: string[];
}) {
  return (
    <section className="feature-page">
      <p className="feature-page__eyebrow">{props.eyebrow}</p>
      <h2>{props.title}</h2>
      <p>{props.description}</p>
      <div className="feature-page__panel">
        <h3>{props.heading}</h3>
        <ul>
          {props.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function toMessage(error: unknown): string {
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

function formatClientName(client: Client): string {
  return [client.firstName, client.lastName].filter(Boolean).join(' ');
}

function normalizeColorHex(colorHex: string | null | undefined): string {
  if (colorHex && /^#[0-9a-fA-F]{6}$/.test(colorHex)) {
    return colorHex;
  }

  return '#2575ff';
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

async function getJson<T>(url: string, authenticatedFetch: AuthenticatedFetch, fallbackMessage: string): Promise<T> {
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    await readError(response, fallbackMessage);
  }

  return (await response.json()) as T;
}

async function sendJson<TResponse>(
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

async function sendPatch(
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

async function sendVoid(
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

function sessionStatusLabel(status: SessionStatus): string {
  switch (status) {
    case 0:
      return 'Planned';
    case 1:
      return 'Completed';
    case 2:
      return 'Cancelled';
    case 3:
      return 'No show';
    default:
      return 'Unknown';
  }
}

function formatSessionWindow(startAtUtc: string, endAtUtc: string): string {
  const start = new Date(startAtUtc);
  const end = new Date(endAtUtc);

  return `${start.toLocaleString()} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function emptyClient(id: string): Client {
  return {
    id,
    firstName: 'Unknown',
    lastName: 'client',
    phone: null,
    email: null,
    notes: null,
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDayKey(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

function buildMonthGrid(month: Date): Date[] {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function combineDayAndTime(day: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const value = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0);
  return toDateTimeLocalValue(value.toISOString());
}

function extractTime(value: string): string | null {
  if (!value.includes('T')) {
    return null;
  }

  return value.slice(11, 16);
}

function formatTimeShort(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeColorHex(hex);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export default App;
