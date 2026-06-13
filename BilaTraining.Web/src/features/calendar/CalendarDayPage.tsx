import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { type TranslationKey, useI18n } from '../../i18n';
import { getJson, sendPatch, sendVoid, toMessage } from '../../shared/api';
import { formatClientName } from '../../shared/client.utils';
import { hexToRgba, normalizeColorHex } from '../../shared/color';
import type { Client, Session, SessionStatus, Workspace } from '../../shared/models';
import { formatTimeShort, parseDayKey, startOfDay, toDayKey } from './calendar.utils';

const HOUR_SLOT_HEIGHT = 72;
const MINUTES_IN_DAY = 24 * 60;
const DAY_TIMELINE_HEIGHT = 24 * HOUR_SLOT_HEIGHT;
const SESSION_COLUMN_GAP = 8;
const MIN_SESSION_BLOCK_HEIGHT = 64;

type TimelineSession = {
  session: Session;
  clientName: string;
  workspaceName: string;
  workspaceColor: string;
  startMinute: number;
  endMinute: number;
  top: number;
  height: number;
  left: string;
  width: string;
  zIndex: number;
};

type TimelineSeed = {
  session: Session;
  clientName: string;
  workspaceName: string;
  workspaceColor: string;
  startMinute: number;
  endMinute: number;
};

export function CalendarDayPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { locale, t } = useI18n();
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
    () => buildTimelineSessions(selectedDaySessions, selectedDay, clientById, workspaceById, t),
    [clientById, selectedDay, selectedDaySessions, t, workspaceById],
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
        t('calendar.updateStatusFailed'),
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

  const handleStatusSelect =
    (session: Session) =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      void handleStatusChange(session, Number(event.target.value) as SessionStatus);
    };

  const handleDelete = async (session: Session) => {
    if (!window.confirm(t('calendar.deleteSessionConfirm'))) {
      return;
    }

    setIsDeletingId(session.id);
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/sessions/${session.id}`, 'DELETE', authenticatedFetch, t('calendar.deleteFailed'));
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
          <p className="feature-page__eyebrow">{t('calendar.dayEyebrow')}</p>
          <h2>{selectedDay.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
        </div>
        <div className="calendar-toolbar">
          <button type="button" className="button button--secondary" onClick={() => navigate(-1)}>
            {t('common.back')}
          </button>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="calendar-page__grid calendar-page__grid--detail">
        <section className="card calendar-day-panel calendar-day-panel--timeline">
          <div className="exercise-page__section-header">
            <h3>{t('calendar.sessionsTitle')}</h3>
            <span className="exercise-page__count">{selectedDaySessions.length}</span>
          </div>

          {isLoading ? <p className="exercise-page__state">{t('calendar.loadingSessions')}</p> : null}
          {!isLoading && selectedDaySessions.length === 0 ? (
            <p className="exercise-page__state">{t('calendar.emptyDay')}</p>
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
                        '--session-accent-soft': hexToRgba(item.workspaceColor, 0.22),
                        '--session-accent-strong': hexToRgba(item.workspaceColor, 0.68),
                        '--session-accent-border': hexToRgba(item.workspaceColor, 0.52),
                        '--session-accent-shadow': hexToRgba(item.workspaceColor, 0.26),
                        top: `${item.top}px`,
                        left: item.left,
                        width: item.width,
                        height: `${item.height}px`,
                        zIndex: item.zIndex,
                      } as CSSProperties}
                      onClick={() => setActiveSessionId(item.session.id)}
                    >
                      <strong>{item.clientName}</strong>
                      <span>
                        {formatTimeShort(item.session.startAtUtc, locale)} - {formatTimeShort(item.session.endAtUtc, locale)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <button
        type="button"
        className="calendar-page__fab"
        aria-label={t('calendar.addSession')}
        onClick={() => navigate(`/calendar/day/${toDayKey(selectedDay)}/session/new`)}
      >
        +
      </button>

      {activeTimelineSession ? (
        <div className="calendar-session-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-session-modal-title">
          <button
            type="button"
            className="calendar-session-modal__scrim"
            aria-label={t('calendar.closeDetails')}
            onClick={() => setActiveSessionId(null)}
          />

          <section className="card calendar-session-modal__card">
            <div className="calendar-session-modal__header">
              <div>
                <p className="feature-page__eyebrow">{t('common.session')}</p>
                <h3 id="calendar-session-modal-title">{activeTimelineSession.clientName}</h3>
                <p className="calendar-session-modal__meta">
                  {activeTimelineSession.workspaceName}
                  {' / '}
                  {formatTimeShort(activeTimelineSession.session.startAtUtc, locale)} - {formatTimeShort(activeTimelineSession.session.endAtUtc, locale)}
                </p>
              </div>

              <div className="calendar-session-modal__header-actions">
                <div className="calendar-session-modal__menu">
                  <button
                    type="button"
                    className="button button--secondary calendar-session-modal__icon-button calendar-session-modal__menu-trigger"
                    aria-label={t('calendar.openSessionActions')}
                    onClick={() => setIsActionMenuOpen((current) => !current)}
                  >
                    ...
                  </button>

                  {isActionMenuOpen ? (
                    <div className="calendar-session-modal__menu-popover">
                      <button
                        type="button"
                        className="calendar-session-modal__menu-item"
                        onClick={() => navigate(`/calendar/day/${toDayKey(selectedDay)}/session/${activeTimelineSession.session.id}/tracking`)}
                      >
                        {t('calendar.recordWorkout')}
                      </button>
                      <button
                        type="button"
                        className="calendar-session-modal__menu-item"
                        onClick={() => navigate(`/calendar/day/${toDayKey(selectedDay)}/session/${activeTimelineSession.session.id}`)}
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        className="calendar-session-modal__menu-item calendar-session-modal__menu-item--danger"
                        disabled={isDeletingId === activeTimelineSession.session.id}
                        onClick={() => void handleDelete(activeTimelineSession.session)}
                      >
                        {isDeletingId === activeTimelineSession.session.id ? t('common.deleting') : t('common.delete')}
                      </button>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="button button--secondary calendar-session-modal__icon-button calendar-session-modal__close"
                  onClick={() => setActiveSessionId(null)}
                  aria-label={t('calendar.closeDetails')}
                >
                  x
                </button>
              </div>
            </div>

            <div className="calendar-session-modal__body">
              <div className="calendar-session-modal__status-group">
                <p className="calendar-session-modal__label">{t('common.status')}</p>
                <div className="field">
                  <select
                    value={activeTimelineSession.session.status}
                    disabled={isSavingStatusId === activeTimelineSession.session.id}
                    onChange={handleStatusSelect(activeTimelineSession.session)}
                  >
                    <option value={0}>{t('status.planned')}</option>
                    <option value={1}>{t('status.completed')}</option>
                    <option value={2}>{t('status.cancelled')}</option>
                    <option value={3}>{t('status.noShow')}</option>
                  </select>
                </div>
              </div>

              {activeTimelineSession.session.notes?.trim() ? (
                <div className="calendar-session-modal__notes">
                  <p className="calendar-session-modal__label">{t('common.notes')}</p>
                  <p>{activeTimelineSession.session.notes}</p>
                </div>
              ) : null}
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
  t: (key: TranslationKey) => string,
): TimelineSession[] {
  const dayStart = startOfDay(selectedDay).getTime();
  const rawSessions = sessions
    .map((session) => {
      const startMinute = clampMinute((new Date(session.startAtUtc).getTime() - dayStart) / 60_000);
      const endMinute = clampMinute((new Date(session.endAtUtc).getTime() - dayStart) / 60_000);
      const safeEndMinute = Math.max(endMinute, startMinute + 15);
      const client = clientById.get(session.clientId);
      const workspace = workspaceById.get(session.workspaceId);
      const workspaceColor = normalizeColorHex(workspace?.colorHex);

      return {
        session,
        clientName: client ? formatClientName(client) : t('common.unknownClient'),
        workspaceName: workspace?.name ?? t('common.unknownWorkspace'),
        workspaceColor,
        startMinute,
        endMinute: safeEndMinute,
      };
    })
    .sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute);

  const groups = groupOverlappingSessions(rawSessions);

  return groups.flatMap((group) => {
    const laidOut = assignColumns(group);
    const columnCount = Math.max(...laidOut.map((item) => item.column), 0) + 1;
    const eventsByColumn = new Map<number, typeof laidOut>();

    for (const item of laidOut) {
      const columnItems = eventsByColumn.get(item.column);

      if (columnItems) {
        columnItems.push(item);
      } else {
        eventsByColumn.set(item.column, [item]);
      }
    }

    return laidOut.map((item) => {
      const durationMinutes = item.endMinute - item.startMinute;
      let span = 1;

      for (let nextColumn = item.column + 1; nextColumn < columnCount; nextColumn += 1) {
        const conflictingItem = (eventsByColumn.get(nextColumn) ?? []).some((candidate) => sessionsOverlap(item, candidate));

        if (conflictingItem) {
          break;
        }

        span += 1;
      }

      return {
        ...item,
        top: (item.startMinute / 60) * HOUR_SLOT_HEIGHT,
        height: Math.max((durationMinutes / 60) * HOUR_SLOT_HEIGHT, MIN_SESSION_BLOCK_HEIGHT),
        left: buildColumnLeft(item.column, columnCount),
        width: buildColumnWidth(span, columnCount),
        zIndex: item.column + 1,
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

function sessionsOverlap(
  left: {
    startMinute: number;
    endMinute: number;
  },
  right: {
    startMinute: number;
    endMinute: number;
  },
): boolean {
  return left.startMinute < right.endMinute && right.startMinute < left.endMinute;
}

function buildColumnLeft(column: number, columnCount: number): string {
  if (columnCount <= 1) {
    return '0';
  }

  return `calc(${(100 / columnCount) * column}% + ${(SESSION_COLUMN_GAP * column) / columnCount}px)`;
}

function buildColumnWidth(span: number, columnCount: number): string {
  if (columnCount <= 1) {
    return '100%';
  }

  return `calc(${(100 * span) / columnCount}% - ${((columnCount - span) * SESSION_COLUMN_GAP) / columnCount}px)`;
}

function clampMinute(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), MINUTES_IN_DAY);
}
