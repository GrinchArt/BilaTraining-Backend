import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { getJson, toMessage } from '../../shared/api';
import type { ClientDashboard, ClientDashboardSession, CoachClientRelationshipStatus } from '../../shared/models';
import { sessionStatusLabel } from '../calendar/calendar.utils';

export function ClientDashboardPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { locale, t } = useI18n();
  const [dashboard, setDashboard] = useState<ClientDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await getJson<ClientDashboard>(
          `${apiBaseUrl}/client-dashboard`,
          authenticatedFetch,
          t('dashboard.loadFailed'),
        );
        if (active) setDashboard(data);
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
  }, [apiBaseUrl, authenticatedFetch, t]);

  const now = Date.now();
  const upcoming = useMemo(
    () => dashboard?.sessions.filter((session) => new Date(session.endAtUtc).getTime() >= now) ?? [],
    [dashboard, now],
  );
  const recent = useMemo(
    () => [...(dashboard?.sessions.filter((session) => new Date(session.endAtUtc).getTime() < now) ?? [])].reverse(),
    [dashboard, now],
  );

  return (
    <section className="exercise-page client-dashboard">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">{t('dashboard.eyebrow')}</p>
          <h2>{t('dashboard.title')}</h2>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}
      {isLoading ? <p className="exercise-page__state">{t('dashboard.loading')}</p> : null}

      {!isLoading && dashboard ? (
        <>
          <section className="client-dashboard__relationships">
            {dashboard.relationships.length === 0 ? (
              <article className="card client-dashboard__empty">
                <h3>{t('dashboard.noCoachTitle')}</h3>
                <p>{t('dashboard.noCoachDescription')}</p>
              </article>
            ) : (
              dashboard.relationships.map((relationship) => (
                <article key={relationship.id} className="card client-dashboard__coach-card">
                  <p className="feature-page__eyebrow">{t('dashboard.coach')}</p>
                  <h3>{relationship.coachName}</h3>
                  <span className={`relationship-badge relationship-badge--${relationship.status}`}>
                    {relationshipStatusLabel(relationship.status, t)}
                  </span>
                </article>
              ))
            )}
          </section>

          <DashboardSessionList
            title={t('dashboard.upcoming')}
            empty={t('dashboard.noUpcoming')}
            sessions={upcoming}
            locale={locale}
            t={t}
          />
          <DashboardSessionList
            title={t('dashboard.recent')}
            empty={t('dashboard.noRecent')}
            sessions={recent.slice(0, 10)}
            locale={locale}
            t={t}
          />
        </>
      ) : null}
    </section>
  );
}

function DashboardSessionList({
  title,
  empty,
  sessions,
  locale,
  t,
}: {
  title: string;
  empty: string;
  sessions: ClientDashboardSession[];
  locale: string;
  t: ReturnType<typeof useI18n>['t'];
}) {
  return (
    <section className="client-dashboard__session-section">
      <h3>{title}</h3>
      {sessions.length === 0 ? <p className="exercise-page__state">{empty}</p> : null}
      <div className="client-dashboard__session-list">
        {sessions.map((session) => (
          <article key={session.id} className="card client-dashboard__session-card">
            <div>
              <strong>{session.workspaceName}</strong>
              <p>{session.coachName}</p>
            </div>
            <div className="client-dashboard__session-meta">
              <span>{formatWindow(session.startAtUtc, session.endAtUtc, locale)}</span>
              <span className={`calendar-status-tag calendar-status-tag--${session.status}`}>
                {sessionStatusLabel(session.status, t)}
              </span>
            </div>
            {session.notes ? <p className="client-dashboard__session-notes">{session.notes}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatWindow(startAtUtc: string, endAtUtc: string, locale: string) {
  const start = new Date(startAtUtc);
  const end = new Date(endAtUtc);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(start);
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time.format(start)}–${time.format(end)}`;
}

function relationshipStatusLabel(
  status: CoachClientRelationshipStatus,
  t: ReturnType<typeof useI18n>['t'],
) {
  const keys = {
    0: 'relationship.managed',
    1: 'relationship.pending',
    2: 'relationship.active',
    3: 'relationship.paused',
    4: 'relationship.ended',
  } as const;
  return t(keys[status]);
}
