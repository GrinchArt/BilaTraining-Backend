import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';

export function ProfilePage() {
  const navigate = useNavigate();
  const { logout, session } = useAuth();
  const { language, setLanguage, t } = useI18n();

  const identityLabel = useMemo(
    () => session?.displayName ?? session?.email ?? t('common.signedIn'),
    [session?.displayName, session?.email, t],
  );

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <section className="exercise-page profile-page">
      <div className="exercise-page__header profile-page__header">
        <div>
          <p className="feature-page__eyebrow">{t('nav.profile')}</p>
          <h2>{t('profile.title')}</h2>
        </div>
      </div>

      <div className="profile-page__grid">
        <section className="card profile-page__panel">
          <p className="feature-page__eyebrow">{t('profile.accountTitle')}</p>
          <h3>{identityLabel}</h3>
          <div className="profile-page__meta">
            <div className="profile-page__field">
              <span>{t('common.email')}</span>
              <strong>{session?.email ?? t('common.noEmail')}</strong>
            </div>
            <div className="profile-page__field">
              <span>{t('profile.userId')}</span>
              <strong>{session?.userId ?? '-'}</strong>
            </div>
          </div>
        </section>

        <section className="card profile-page__panel">
          <p className="feature-page__eyebrow">{t('common.language')}</p>
          <h3>{t('profile.preferencesTitle')}</h3>
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
        </section>

        <section className="card profile-page__panel profile-page__panel--danger">
          <p className="feature-page__eyebrow">{t('profile.sessionTitle')}</p>
          <h3>{t('profile.sessionActionsTitle')}</h3>
          <button type="button" className="button button--danger" onClick={handleLogout}>
            {t('common.logout')}
          </button>
        </section>
      </div>
    </section>
  );
}
