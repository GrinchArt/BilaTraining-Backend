import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { getJson, sendVoid, toMessage } from '../../shared/api';
import { emptyClient, formatClientName } from '../../shared/client.utils';
import type { Client, Session, SessionStatus, Workspace } from '../../shared/models';
import { formatSessionWindow, sessionStatusLabel } from '../calendar/calendar.utils';
import { SessionFormPage } from './SessionFormPage';

export { SessionFormPage };

export function SessionsPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | `${SessionStatus}`>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const workspaceById = useMemo(
    () => new Map(workspaces.map((workspace) => [workspace.id, workspace])),
    [workspaces],
  );
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  const loadSessionsPage = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [nextSessions, nextClients, nextWorkspaces] = await Promise.all([
        getJson<Session[]>(`${apiBaseUrl}/sessions`, authenticatedFetch, t('sessions.loadFailed')),
        getJson<Client[]>(`${apiBaseUrl}/clients`, authenticatedFetch, t('clients.loadFailed')),
        getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, t('workspaces.loadFailed')),
      ]);

      setSessions(nextSessions);
      setClients(nextClients);
      setWorkspaces(nextWorkspaces);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch, t]);

  useEffect(() => {
    void loadSessionsPage();
  }, [loadSessionsPage]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return [...sessions]
      .sort((left, right) => new Date(left.startAtUtc).getTime() - new Date(right.startAtUtc).getTime())
      .filter((session) => {
        if (statusFilter !== 'all' && `${session.status}` !== statusFilter) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const clientLabel = formatClientName(clientById.get(session.clientId) ?? emptyClient(session.clientId));
        const workspaceLabel = workspaceById.get(session.workspaceId)?.name ?? t('common.unknownWorkspace');
        const statusLabel = sessionStatusLabel(session.status, t);
        const haystack = [clientLabel, workspaceLabel, statusLabel, session.notes ?? ''].join(' ').toLowerCase();

        return haystack.includes(normalizedQuery);
      });
  }, [clientById, search, sessions, statusFilter, t, workspaceById]);

  const handleDelete = async (session: Session) => {
    setIsDeletingId(session.id);
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/sessions/${session.id}`, 'DELETE', authenticatedFetch, t('sessions.deleteFailed'));
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
          <p className="feature-page__eyebrow">{t('sessions.title')}</p>
          <h2>{t('sessions.title')}</h2>
          <p>{t('sessions.description')}</p>
        </div>
        <div className="calendar-toolbar">
          <button type="button" className="button" aria-label={t('calendar.addSession')} onClick={() => navigate('/sessions/new')}>
            +
          </button>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid exercise-page__grid--single">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>{t('sessions.list')}</h3>
            <span className="exercise-page__count">{filteredSessions.length}</span>
          </div>

          <div className="field">
            <label htmlFor="session-search">{t('common.search')}</label>
            <input
              id="session-search"
              type="search"
              placeholder={t('sessions.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="session-statusFilter">{t('common.status')}</label>
            <select
              id="session-statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | `${SessionStatus}`)}
            >
              <option value="all">{t('sessions.allStatuses')}</option>
              <option value="0">{t('status.planned')}</option>
              <option value="1">{t('status.completed')}</option>
              <option value="2">{t('status.cancelled')}</option>
              <option value="3">{t('status.noShow')}</option>
            </select>
          </div>

          {isLoading ? <p className="exercise-page__state">{t('sessions.loading')}</p> : null}
          {!isLoading && filteredSessions.length === 0 ? <p className="exercise-page__state">{t('sessions.emptyFilters')}</p> : null}
          {!isLoading && filteredSessions.length > 0 ? (
            <div className="exercise-list">
              {filteredSessions.map((session) => {
                const client = clientById.get(session.clientId);
                const workspace = workspaceById.get(session.workspaceId);

                return (
                  <article key={session.id} className="exercise-item">
                    <div className="exercise-item__content">
                      <div className="exercise-item__title-row">
                        <h4>{workspace?.name ?? t('common.unknownWorkspace')}</h4>
                        <span className={`exercise-item__tag calendar-status-tag calendar-status-tag--${session.status}`}>
                          {sessionStatusLabel(session.status, t)}
                        </span>
                      </div>

                      <div className="client-item__meta">
                        <span>{client ? formatClientName(client) : t('common.unknownClient')}</span>
                        <span>{formatSessionWindow(session.startAtUtc, session.endAtUtc, locale)}</span>
                      </div>

                      {session.notes ? <p>{session.notes}</p> : <p className="exercise-item__muted">{t('common.noNotes')}</p>}
                    </div>

                    <div className="exercise-item__actions">
                      <button type="button" className="button button--secondary" onClick={() => navigate(`/sessions/${session.id}/edit`)}>
                        {t('common.edit')}
                      </button>
                      <button type="button" className="button button--danger" disabled={isDeletingId === session.id} onClick={() => void handleDelete(session)}>
                        {isDeletingId === session.id ? t('common.deleting') : t('common.delete')}
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
