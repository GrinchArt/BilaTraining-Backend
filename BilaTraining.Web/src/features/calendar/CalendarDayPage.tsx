import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { getJson, sendPatch, sendVoid, toMessage } from '../../shared/api';
import { formatClientName } from '../../shared/client.utils';
import type { Client, Session, SessionStatus, Workspace } from '../../shared/models';
import { formatTimeShort, parseDayKey, sessionStatusLabel, startOfDay, toDayKey } from './calendar.utils';

const HOUR_SLOT_HEIGHT = 72;
const MINUTES_IN_DAY = 24 * 60;
const DAY_TIMELINE_HEIGHT = 24 * HOUR_SLOT_HEIGHT;

type TimelineSession = {
  session: Session;
  clientName: string;
  workspaceName: string;
  startMinute: number;
  endMinute: number;
  top: number;
  height: number;
  left: string;
  width: string;
};

type TimelineSeed = {
  session: Session;
  clientName: string;
  workspaceName: string;
  startMinute: number;
  endMinute: number;
};

const STATUS_OPTIONS: SessionStatus[] = [0, 1, 2, 3];

export function CalendarDayPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const { dayKey } = useParams<{ dayKey: string }>();
  const selectedDay = useMemo(() => parseDayKey(dayKey) ?? startOfDay(new Date()), [dayKey]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStatusId, setIsSavingStatusId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const timelineScrollerRef = useRef<HTMLDivElement | null>(null);

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

  const timelineSessions = useMemo(
    () => buildTimelineSessions(selectedDaySessions, selectedDay, clientById, workspaceById),
    [clientById, selectedDay, selectedDaySessions, workspaceById],
  );

  const activeTimelineSession = useMemo(
    () => timelineSessions.find((item) => item.session.id === activeSessionId) ?? null,
    [activeSessionId, timelineSessions],
  );

  useEffect(() => {
    if (!activeTimelineSession) {
      setIsActionMenuOpen(false);
    }
  }, [activeTimelineSession]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveSessionId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSessionId]);

  useEffect(() => {
    const scroller = timelineScrollerRef.current;
    if (!scroller || timelineSessions.length === 0) {
      return;
    }

    const earliestMinute = Math.min(...timelineSessions.map((item) => item.startMinute));
    const targetScrollTop = Math.max(Math.floor((earliestMinute / 60 - 1) * HOUR_SLOT_HEIGHT), 0);
    scroller.scrollTop = targetScrollTop;
  }, [timelineSessions]);

  const handleStatusChange = async (session: Session, status: SessionStatus) => {
    if (session.status === status) {
      return;
    }

    setIsSavingStatusId(session.id);
    setErrorMessage('');

    try {
      await sendPatch(
        `${apiBaseUrl}/sessions/${session.id}/status`,
        authenticatedFetch,
        { status },
        'Failed to update session status.',
      );

      setSessions((current) =>
        current.map((item) =>
          item.id === session.id
            ? {
                ...item,
                status,
              }
            : item,
        ),
      );
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSavingStatusId(null);
    }
  };

  const handleDelete = async (session: Session) => {
    if (!window.confirm('Delete this session?')) {
      return;
    }

    setIsDeletingId(session.id);
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/sessions/${session.id}`, 'DELETE', authenticatedFetch, 'Failed to delete session.');
      setSessions((current) => current.filter((item) => item.id !== session.id));
      setActiveSessionId(null);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <section className="calendar-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">Calendar Day</p>
          <h2>{selectedDay.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
          <p>Use the timeline to review overlapping sessions, then tap one to change status, edit it, or delete it.</p>
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
        <section className="card calendar-day-panel calendar-day-panel--timeline">
          <div className="exercise-page__section-header">
            <div>
              <h3>Sessions</h3>
              <p className="calendar-day-panel__caption">Day view with overlapping sessions placed side by side.</p>
            </div>
            <span className="exercise-page__count">{selectedDaySessions.length}</span>
          </div>

          {isLoading ? <p className="exercise-page__state">Loading sessions...</p> : null}
          {!isLoading && selectedDaySessions.length === 0 ? (
            <p className="exercise-page__state">No sessions yet. Add the first one for this day.</p>
          ) : null}
          {!isLoading && selectedDaySessions.length > 0 ? (
            <div ref={timelineScrollerRef} className="calendar-timeline__scroller">
              <div className="calendar-timeline" style={{ height: `${DAY_TIMELINE_HEIGHT}px` }}>
                <div className="calendar-timeline__axis" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div
                      key={hour}
                      className="calendar-timeline__axis-label"
                      style={{ top: `${hour * HOUR_SLOT_HEIGHT}px` }}
                    >
                      {`${hour}`.padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                <div className="calendar-timeline__surface">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div
                      key={hour}
                      className="calendar-timeline__hour-line"
                      style={{ top: `${hour * HOUR_SLOT_HEIGHT}px` }}
                    />
                  ))}

                  {timelineSessions.map((item) => (
                    <button
                      key={item.session.id}
                      type="button"
                      className={`calendar-session-block calendar-session-block--${item.session.status}`}
                      style={{
                        top: `${item.top}px`,
                        left: item.left,
                        width: item.width,
                        height: `${item.height}px`,
                      }}
                      onClick={() => setActiveSessionId(item.session.id)}
                    >
                      <span className="calendar-session-block__time">
                        {formatTimeShort(item.session.startAtUtc)} - {formatTimeShort(item.session.endAtUtc)}
                      </span>
                      <strong>{item.clientName}</strong>
                      <span>{item.workspaceName}</span>
                      <span className={`exercise-item__tag calendar-status-tag calendar-status-tag--${item.session.status}`}>
                        {sessionStatusLabel(item.session.status)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {activeTimelineSession ? (
        <div className="calendar-session-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-session-modal-title">
          <button
            type="button"
            className="calendar-session-modal__scrim"
            aria-label="Close session details"
            onClick={() => setActiveSessionId(null)}
          />

          <section className="card calendar-session-modal__card">
            <div className="calendar-session-modal__header">
              <div>
                <p className="feature-page__eyebrow">Session</p>
                <h3 id="calendar-session-modal-title">{activeTimelineSession.clientName}</h3>
                <p className="calendar-session-modal__meta">
                  {activeTimelineSession.workspaceName}
                  {' / '}
                  {formatTimeShort(activeTimelineSession.session.startAtUtc)} - {formatTimeShort(activeTimelineSession.session.endAtUtc)}
                </p>
              </div>

              <div className="calendar-session-modal__header-actions">
                <div className="calendar-session-modal__menu">
                  <button
                    type="button"
                    className="button button--secondary calendar-session-modal__menu-trigger"
                    aria-label="Open session actions"
                    onClick={() => setIsActionMenuOpen((current) => !current)}
                  >
                    ...
                  </button>

                  {isActionMenuOpen ? (
                    <div className="calendar-session-modal__menu-popover">
                      <button
                        type="button"
                        className="calendar-session-modal__menu-item"
                        onClick={() => navigate(`/calendar/day/${toDayKey(selectedDay)}/session/${activeTimelineSession.session.id}`)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="calendar-session-modal__menu-item calendar-session-modal__menu-item--danger"
                        disabled={isDeletingId === activeTimelineSession.session.id}
                        onClick={() => void handleDelete(activeTimelineSession.session)}
                      >
                        {isDeletingId === activeTimelineSession.session.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="button button--secondary calendar-session-modal__close"
                  onClick={() => setActiveSessionId(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="calendar-session-modal__body">
              <div className="calendar-session-modal__status-group">
                <p className="calendar-session-modal__label">Status</p>
                <div className="calendar-session-modal__status-options">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`calendar-session-modal__status-option calendar-status-tag calendar-status-tag--${status}${
                        activeTimelineSession.session.status === status ? ' is-active' : ''
                      }`}
                      disabled={isSavingStatusId === activeTimelineSession.session.id}
                      onClick={() => void handleStatusChange(activeTimelineSession.session, status)}
                    >
                      {sessionStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="calendar-session-modal__details">
                <div>
                  <p className="calendar-session-modal__label">Client</p>
                  <p>{activeTimelineSession.clientName}</p>
                </div>
                <div>
                  <p className="calendar-session-modal__label">Workspace</p>
                  <p>{activeTimelineSession.workspaceName}</p>
                </div>
                <div>
                  <p className="calendar-session-modal__label">Time</p>
                  <p>
                    {formatTimeShort(activeTimelineSession.session.startAtUtc)} - {formatTimeShort(activeTimelineSession.session.endAtUtc)}
                  </p>
                </div>
                <div>
                  <p className="calendar-session-modal__label">Notes</p>
                  <p>{activeTimelineSession.session.notes?.trim() ? activeTimelineSession.session.notes : 'No notes.'}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function buildTimelineSessions(
  sessions: Session[],
  selectedDay: Date,
  clientById: Map<string, Client>,
  workspaceById: Map<string, Workspace>,
): TimelineSession[] {
  const dayStart = startOfDay(selectedDay).getTime();
  const rawSessions = sessions.map((session) => {
    const startMinute = clampMinute((new Date(session.startAtUtc).getTime() - dayStart) / 60_000);
    const endMinute = clampMinute((new Date(session.endAtUtc).getTime() - dayStart) / 60_000);
    const safeEndMinute = Math.max(endMinute, startMinute + 15);
    const client = clientById.get(session.clientId);
    const workspace = workspaceById.get(session.workspaceId);

    return {
      session,
      clientName: client ? formatClientName(client) : 'Unknown client',
      workspaceName: workspace?.name ?? 'Unknown workspace',
      startMinute,
      endMinute: safeEndMinute,
    };
  });

  const groups = groupOverlappingSessions(rawSessions);

  return groups.flatMap((group) => {
    const laidOut = assignColumns(group);
    const totalColumns = Math.max(...laidOut.map((item) => item.column + 1), 1);

    return laidOut.map((item) => {
      const width = `calc(${100 / totalColumns}% - 6px)`;
      const left = `calc(${(100 / totalColumns) * item.column}% + 3px)`;
      const durationMinutes = item.endMinute - item.startMinute;

      return {
        ...item,
        top: (item.startMinute / 60) * HOUR_SLOT_HEIGHT,
        height: Math.max((durationMinutes / 60) * HOUR_SLOT_HEIGHT, 56),
        left,
        width,
      };
    });
  });
}

function groupOverlappingSessions(
  sessions: TimelineSeed[],
): TimelineSeed[][] {
  const groups: TimelineSeed[][] = [];
  let currentGroup: TimelineSeed[] = [];
  let currentGroupEnd = -1;

  for (const session of sessions) {
    if (currentGroup.length === 0 || session.startMinute < currentGroupEnd) {
      currentGroup.push(session);
      currentGroupEnd = Math.max(currentGroupEnd, session.endMinute);
      continue;
    }

    groups.push(currentGroup);
    currentGroup = [session];
    currentGroupEnd = session.endMinute;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function assignColumns<
  TSession extends {
    startMinute: number;
    endMinute: number;
  },
>(sessions: TSession[]) {
  const columnEndMinutes: number[] = [];

  return sessions.map((session) => {
    let column = columnEndMinutes.findIndex((endMinute) => session.startMinute >= endMinute);

    if (column === -1) {
      column = columnEndMinutes.length;
      columnEndMinutes.push(session.endMinute);
    } else {
      columnEndMinutes[column] = session.endMinute;
    }

    return {
      ...session,
      column,
    };
  });
}

function clampMinute(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), MINUTES_IN_DAY);
}
