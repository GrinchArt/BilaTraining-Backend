import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';

import { useAuth } from '../auth';

export function AppShell() {
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
