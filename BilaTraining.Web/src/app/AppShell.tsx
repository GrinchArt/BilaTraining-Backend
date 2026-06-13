import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth';
import { useI18n } from '../i18n';

type BottomNavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const showBottomNav = isAuthenticated && !location.pathname.startsWith('/auth/');
  const isMoreActive = useMemo(
    () => ['/clients', '/workspaces', '/exercises'].some((path) => location.pathname.startsWith(path)),
    [location.pathname],
  );

  const bottomNavItems = useMemo<BottomNavItem[]>(
    () => [
      {
        to: '/calendar',
        label: t('nav.calendar'),
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
            <path d="M7.5 2.75v3.5M16.5 2.75v3.5M3.5 9.25h17" />
            <path d="M8 12.5h.01M12 12.5h.01M16 12.5h.01M8 16.5h.01M12 16.5h.01M16 16.5h.01" />
          </svg>
        ),
      },
      {
        to: '/reports',
        label: t('nav.reports'),
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5h16" />
            <path d="M7 16V10.5" />
            <path d="M12 16V6.5" />
            <path d="M17 16v-3.5" />
          </svg>
        ),
      },
      {
        to: '/profile',
        label: t('nav.profile'),
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
        ),
      },
    ],
    [t],
  );

  const moreItems = useMemo(
    () => [
      { to: '/clients', label: t('nav.clients') },
      { to: '/workspaces', label: t('nav.workspaces') },
      { to: '/exercises', label: t('nav.exercises') },
    ],
    [t],
  );

  useEffect(() => {
    setMoreMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moreMenuOpen]);

  return (
    <div className="shell">
      {moreMenuOpen ? (
        <button type="button" className="shell__scrim" aria-label={t('common.close')} onClick={() => setMoreMenuOpen(false)} />
      ) : null}

      <header className="shell__header">
        <div className="shell__header-main">
          <h1>{t('app.name')}</h1>
          <p>{t('app.dashboard')}</p>
        </div>
      </header>

      <main className="shell__content">
        <Outlet />
      </main>

      {showBottomNav ? (
        <>
          <nav className="shell__bottom-nav" aria-label={t('common.navigation')}>
            {bottomNavItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `shell__bottom-nav-link${isActive ? ' is-active' : ''}`}>
                <span className="shell__bottom-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}

            <button
              type="button"
              className={`shell__bottom-nav-link shell__bottom-nav-link--button${moreMenuOpen || isMoreActive ? ' is-active' : ''}`}
              aria-expanded={moreMenuOpen}
              aria-controls="shell-more-menu"
              onClick={() => setMoreMenuOpen((current) => !current)}
            >
              <span className="shell__bottom-nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h.01M12 12h.01M19 12h.01" />
                </svg>
              </span>
              <span>{t('nav.more')}</span>
            </button>
          </nav>

          {moreMenuOpen ? (
            <section id="shell-more-menu" className="shell__more-sheet" role="dialog" aria-modal="true" aria-labelledby="shell-more-title">
              <div className="shell__more-sheet-header">
                <div>
                  <p className="shell__eyebrow">{t('common.navigation')}</p>
                  <h2 id="shell-more-title">{t('nav.more')}</h2>
                </div>
                <button type="button" className="button button--ghost button--compact shell__more-close" aria-label={t('common.close')} onClick={() => setMoreMenuOpen(false)}>
                  x
                </button>
              </div>

              <div className="shell__more-grid">
                {moreItems.map((item) => (
                  <button key={item.to} type="button" className={`shell__more-link${location.pathname.startsWith(item.to) ? ' is-active' : ''}`} onClick={() => navigate(item.to)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
