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
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from './auth';

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
              <FeaturePage
                eyebrow="Sessions"
                title="Sessions"
                description="This screen will handle scheduling sessions, browsing past ones, and linking them to clients, workspaces, and exercises."
                heading="Planned first steps"
                items={[
                  'List sessions with workspace and client filters',
                  'Add create and update actions',
                  'Prepare entry into exercise-set tracking',
                ]}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="calendar"
          element={
            <ProtectedRoute>
              <FeaturePage
                eyebrow="Calendar"
                title="Calendar"
                description="This page is intentionally a placeholder for now. We will shape the calendar after your comments on the scheduling experience."
                heading="Planned later"
                items={[
                  'Choose the best calendar layout for phones',
                  'Connect sessions into daily and weekly views',
                  'Add quick navigation between schedule and session details',
                ]}
              />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  const location = useLocation();
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

      <main className="shell__content" key={location.pathname}>
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
  const { apiBaseUrl, session } = useAuth();
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
        session?.accessToken,
        'Failed to load clients.',
      );

      setClients(data);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, search, session?.accessToken]);

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
          session?.accessToken,
          payload,
          'Failed to update client.',
        );
      } else {
        await sendJson(
          `${apiBaseUrl}/clients`,
          'POST',
          session?.accessToken,
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
        session?.accessToken,
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
  const { apiBaseUrl, session } = useAuth();
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
        session?.accessToken,
        'Failed to load workspaces.',
      );

      setWorkspaces(data);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, session?.accessToken]);

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
          session?.accessToken,
          payload,
          'Failed to update workspace.',
        );
      } else {
        await sendJson(
          `${apiBaseUrl}/workspaces`,
          'POST',
          session?.accessToken,
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
        session?.accessToken,
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
  const { apiBaseUrl, session } = useAuth();
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
        const response = await fetch(`${apiBaseUrl}/exercises`, {
          headers: {
            Authorization: `Bearer ${session?.accessToken ?? ''}`,
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Failed to load exercises.' }));
          throw { status: response.status, error };
        }

        const data = (await response.json()) as Exercise[];

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
  }, [apiBaseUrl, session?.accessToken]);

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
        const response = await fetch(`${apiBaseUrl}/exercises/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken ?? ''}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Failed to update exercise.' }));
          throw { status: response.status, error };
        }

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
        const response = await fetch(`${apiBaseUrl}/exercises`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken ?? ''}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Failed to create exercise.' }));
          throw { status: response.status, error };
        }

        const created = (await response.json()) as Exercise;
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
      const response = await fetch(`${apiBaseUrl}/exercises/${exercise.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.accessToken ?? ''}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete exercise.' }));
        throw { status: response.status, error };
      }

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

async function getJson<T>(url: string, accessToken: string | null | undefined, fallbackMessage: string): Promise<T> {
  const response = await fetch(url, {
    headers: createAuthHeaders(accessToken),
  });

  if (!response.ok) {
    await readError(response, fallbackMessage);
  }

  return (await response.json()) as T;
}

async function sendJson<TResponse>(
  url: string,
  method: 'POST' | 'PUT',
  accessToken: string | null | undefined,
  payload: unknown,
  fallbackMessage: string,
): Promise<TResponse | null> {
  const response = await fetch(url, {
    method,
    headers: createAuthHeaders(accessToken, true),
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

async function sendVoid(
  url: string,
  method: 'DELETE',
  accessToken: string | null | undefined,
  fallbackMessage: string,
): Promise<void> {
  const response = await fetch(url, {
    method,
    headers: createAuthHeaders(accessToken),
  });

  if (!response.ok) {
    await readError(response, fallbackMessage);
  }
}

export default App;
