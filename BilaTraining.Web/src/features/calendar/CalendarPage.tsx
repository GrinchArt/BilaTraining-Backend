import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth';
import { getJson, toMessage } from '../../shared/api';
import { formatClientName } from '../../shared/client.utils';
import { hexToRgba, normalizeColorHex } from '../../shared/color';
import type { Client, Session, Workspace } from '../../shared/models';
import { buildMonthGrid, formatTimeShort, startOfDay, toDayKey } from './calendar.utils';

export function CalendarPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const workspaceById = useMemo(() => new Map(workspaces.map((workspace) => [workspace.id, workspace])), [workspaces]);

  const loadCalendar = useCallback(async () => {
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
    void loadCalendar();
  }, [loadCalendar]);

  const monthDays = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, Session[]>();

    for (const session of sessions) {
      const key = toDayKey(new Date(session.startAtUtc));
      const items = map.get(key) ?? [];
      items.push(session);
      map.set(key, items);
    }

    for (const items of map.values()) {
      items.sort((left, right) => new Date(left.startAtUtc).getTime() - new Date(right.startAtUtc).getTime());
    }

    return map;
  }, [sessions]);

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const handlePickDay = (day: Date) => {
    const normalized = startOfDay(day);
    navigate(`/calendar/day/${toDayKey(normalized)}`);
  };

  return (
    <section className="calendar-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">Calendar</p>
          <h2>Calendar</h2>
          <p>Plan the month first. Open a day to see every entry, including overlapping sessions.</p>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <section className="card calendar-board">
        <div className="calendar-board__header">
          <button type="button" className="button button--secondary" onClick={() => moveMonth(-1)}>
            Prev
          </button>
          <div className="calendar-board__title">
            <h3>{visibleMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h3>
            <p>{sessionsByDay.size} active day entries</p>
          </div>
          <button type="button" className="button button--secondary" onClick={() => moveMonth(1)}>
            Next
          </button>
        </div>

        <div className="calendar-board__weekdays">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="calendar-board__days">
          {monthDays.map((day) => {
            const dayKey = toDayKey(day);
            const daySessions = sessionsByDay.get(dayKey) ?? [];
            const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
            const isToday = dayKey === toDayKey(today);

            return (
              <button
                type="button"
                key={dayKey}
                className={`calendar-day${isCurrentMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}`}
                onClick={() => handlePickDay(day)}
              >
                <span className="calendar-day__number">{day.getDate()}</span>
                <div className="calendar-day__items">
                  {daySessions.slice(0, 2).map((session) => {
                    const workspace = workspaceById.get(session.workspaceId);
                    const client = clientById.get(session.clientId);
                    const workspaceColor = normalizeColorHex(workspace?.colorHex);

                    return (
                      <span
                        key={session.id}
                        className={`calendar-chip calendar-chip--${session.status}`}
                        style={{
                          backgroundColor: hexToRgba(workspaceColor, 0.22),
                          borderColor: hexToRgba(workspaceColor, 0.48),
                        }}
                      >
                        <strong>{formatTimeShort(session.startAtUtc)}</strong>
                        <span>{client ? formatClientName(client) : workspace?.name ?? 'Session'}</span>
                      </span>
                    );
                  })}
                  {daySessions.length > 2 ? <span className="calendar-day__more">+{daySessions.length - 2}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}
