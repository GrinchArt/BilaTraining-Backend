import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';

import { useAuth } from '../auth';
import { useI18n } from '../i18n';

export function AppShell() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, session } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const identityLabel = useMemo(
    () => session?.displayName ?? session?.email ?? t('common.signedIn'),
    [session?.displayName, session?.email, t],
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
        { to: '/clients', label: t('nav.clients') },
        { to: '/workspaces', label: t('nav.workspaces') },
        { to: '/exercises', label: t('nav.exercises') },
        { to: '/calendar', label: t('nav.calendar') },
        { to: '/reports', label: t('nav.reports') },
      ]
    : [
        { to: '/auth/login', label: t('nav.login') },
        { to: '/auth/register', label: t('nav.register') },
      ];

  return (
    <div className="shell">
      {menuOpen ? (
        <button type="button" className="shell__scrim" aria-label={t('common.close')} onClick={closeMenu} />
      ) : null}

      <header className="shell__header">
        <div className="shell__header-row">
          <button
            type="button"
            className={`shell__burger${menuOpen ? ' is-active' : ''}`}
            aria-expanded={menuOpen}
            aria-controls="primary-menu"
            aria-label={t('common.navigation')}
            onClick={toggleMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className="shell__header-main">
            <p className="shell__eyebrow">{t('app.name')}</p>
            <h1>{t('app.dashboard')}</h1>
          </div>
        </div>
      </header>

      <aside id="primary-menu" className={`shell__drawer${menuOpen ? ' is-open' : ''}`}>
        <div className="shell__drawer-card">
          <p className="shell__drawer-eyebrow">{t('common.navigation')}</p>
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

          <div className="shell__locale">
            <p className="shell__drawer-eyebrow">{t('common.language')}</p>
            <div className="shell__locale-toggle" role="group" aria-label={t('common.language')}>
              <button
                type="button"
                className={`shell__locale-button${language === 'en' ? ' is-active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                {t('common.english')}
              </button>
              <button
                type="button"
                className={`shell__locale-button${language === 'uk' ? ' is-active' : ''}`}
                onClick={() => setLanguage('uk')}
              >
                {t('common.ukrainian')}
              </button>
            </div>
          </div>

          <div className="shell__drawer-footer">
            {isAuthenticated ? (
              <div className="shell__profile">
                <p className="shell__identity">
                  <strong>{identityLabel}</strong>
                </p>
                <button type="button" className="shell__logout" onClick={handleLogout}>
                  {t('common.logout')}
                </button>
              </div>
            ) : (
              <p className="shell__identity">{t('common.notSignedIn')}</p>
            )}
          </div>
        </div>
      </aside>

      <main className="shell__content">
        <Outlet />
      </main>
    </div>
  );
}
