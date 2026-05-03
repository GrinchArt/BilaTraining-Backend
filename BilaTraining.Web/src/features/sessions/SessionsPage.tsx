import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth';
import { getJson, sendVoid, toMessage } from '../../shared/api';
import { emptyClient, formatClientName } from '../../shared/client.utils';
import type { Client, Session, SessionStatus, Workspace } from '../../shared/models';
import { formatSessionWindow, sessionStatusLabel } from '../calendar/calendar.utils';
import { SessionFormPage } from './SessionFormPage';

export { SessionFormPage };

export function SessionsPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
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
        const workspaceLabel = workspaceById.get(session.workspaceId)?.name ?? 'Unknown workspace';
        const statusLabel = sessionStatusLabel(session.status);
        const haystack = [clientLabel, workspaceLabel, statusLabel, session.notes ?? ''].join(' ').toLowerCase();

        return haystack.includes(normalizedQuery);
      });
  }, [clientById, search, sessions, statusFilter, workspaceById]);

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
          <p>Use the list to search and filter sessions, then open a dedicated page to create or edit them.</p>
        </div>
        <div className="calendar-toolbar">
          <button type="button" className="button" aria-label="Add session" onClick={() => navigate('/sessions/new')}>
            +
          </button>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid exercise-page__grid--single">
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
            <select
              id="session-statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | `${SessionStatus}`)}
            >
              <option value="all">All statuses</option>
              <option value="0">Planned</option>
              <option value="1">Completed</option>
              <option value="2">Cancelled</option>
              <option value="3">No show</option>
            </select>
          </div>

          {isLoading ? <p className="exercise-page__state">Loading sessions...</p> : null}
          {!isLoading && filteredSessions.length === 0 ? <p className="exercise-page__state">No sessions match the current filters.</p> : null}
          {!isLoading && filteredSessions.length > 0 ? (
            <div className="exercise-list">
              {filteredSessions.map((session) => {
                const client = clientById.get(session.clientId);
                const workspace = workspaceById.get(session.workspaceId);

                return (
                  <article key={session.id} className="exercise-item">
                    <div className="exercise-item__content">
                      <div className="exercise-item__title-row">
                        <h4>{workspace?.name ?? 'Unknown workspace'}</h4>
                        <span className={`exercise-item__tag calendar-status-tag calendar-status-tag--${session.status}`}>
                          {sessionStatusLabel(session.status)}
                        </span>
                      </div>

                      <div className="client-item__meta">
                        <span>{client ? formatClientName(client) : 'Unknown client'}</span>
                        <span>{formatSessionWindow(session.startAtUtc, session.endAtUtc)}</span>
                      </div>

                      {session.notes ? <p>{session.notes}</p> : <p className="exercise-item__muted">No notes.</p>}
                    </div>

                    <div className="exercise-item__actions">
                      <button type="button" className="button button--secondary" onClick={() => navigate(`/sessions/${session.id}/edit`)}>
                        Edit
                      </button>
                      <button type="button" className="button button--danger" disabled={isDeletingId === session.id} onClick={() => void handleDelete(session)}>
                        {isDeletingId === session.id ? 'Deleting...' : 'Delete'}
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
