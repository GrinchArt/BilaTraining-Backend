import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { getJson, sendJson, toMessage } from '../../shared/api';
import type { InvitationPreview } from '../../shared/models';

export function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { apiBaseUrl, authenticatedFetch, isAuthenticated, refresh } = useAuth();
  const { locale, t } = useI18n();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMessage(t('invitation.invalid'));
      setIsLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const data = await getJson<InvitationPreview>(
          `${apiBaseUrl}/invitations/${encodeURIComponent(token)}`,
          authenticatedFetch,
          t('invitation.loadFailed'),
        );
        if (active) setPreview(data);
      } catch (error) {
        if (active) setErrorMessage(toMessage(error));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, authenticatedFetch, t, token]);

  const accept = async () => {
    if (!token) return;
    setIsAccepting(true);
    setErrorMessage('');
    try {
      await sendJson(
        `${apiBaseUrl}/invitations/${encodeURIComponent(token)}/accept`,
        'POST',
        authenticatedFetch,
        {},
        t('invitation.acceptFailed'),
      );
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsAccepting(false);
    }
  };

  const returnTo = token ? `/join/${encodeURIComponent(token)}` : '/';
  const authQuery = `?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <section className="invitation-page">
      <article className="card invitation-card">
        <p className="feature-page__eyebrow">{t('invitation.eyebrow')}</p>
        <h2>{t('invitation.title')}</h2>

        {isLoading ? <p>{t('invitation.loading')}</p> : null}
        {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

        {preview ? (
          <>
            <div className="invitation-card__summary">
              <div>
                <span>{t('invitation.coach')}</span>
                <strong>{preview.coachName}</strong>
              </div>
              <div>
                <span>{t('invitation.clientCard')}</span>
                <strong>{preview.clientName}</strong>
              </div>
              <div>
                <span>{t('invitation.expires')}</span>
                <strong>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(preview.expiresAtUtc))}</strong>
              </div>
            </div>

            {isAuthenticated ? (
              <button type="button" className="submit-button" disabled={isAccepting} onClick={() => void accept()}>
                {isAccepting ? t('invitation.accepting') : t('invitation.accept')}
              </button>
            ) : (
              <div className="invitation-card__actions">
                <Link className="submit-button" to={`/auth/register${authQuery}`}>
                  {t('invitation.register')}
                </Link>
                <Link className="button button--ghost" to={`/auth/login${authQuery}`}>
                  {t('invitation.login')}
                </Link>
              </div>
            )}
          </>
        ) : null}
      </article>
    </section>
  );
}
