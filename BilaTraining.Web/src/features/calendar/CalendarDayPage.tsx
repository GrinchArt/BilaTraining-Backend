import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { getJson, toMessage } from '../../shared/api';
import { formatClientName } from '../../shared/client.utils';
import type { Client, Session, Workspace } from '../../shared/models';
import { formatSessionWindow, parseDayKey, sessionStatusLabel, startOfDay, toDayKey } from './calendar.utils';

export function CalendarDayPage() {
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
            Back
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
