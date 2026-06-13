import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { getJson, sendJson, sendPatch, toMessage } from '../../shared/api';
import { formatClientName } from '../../shared/client.utils';
import type { Client, Session, SessionStatus, Workspace } from '../../shared/models';
import { combineDayAndTime, extractTime, parseDayKey, startOfDay, toDateTimeLocalValue, toDayKey } from './calendar.utils';
import { getScheduleAnchorDay, getSelectableScheduleDays, syncSelectedDayKeys, type SessionScheduleMode } from '../sessions/sessionSchedule';

export function CalendarSessionFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const { dayKey, sessionId } = useParams<{ dayKey: string; sessionId: string }>();
  const selectedDay = useMemo(() => parseDayKey(dayKey) ?? startOfDay(new Date()), [dayKey]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scheduleMode, setScheduleMode] = useState<SessionScheduleMode>('single');
  const createStartAtLocal = useMemo(() => combineDayAndTime(selectedDay, '09:00'), [selectedDay]);
  const createEndAtLocal = useMemo(() => combineDayAndTime(selectedDay, '10:00'), [selectedDay]);
  const [form, setForm] = useState<{
    workspaceId: string;
    clientId: string;
    startAtLocal: string;
    endAtLocal: string;
    notes: string;
    status: SessionStatus;
  }>({
    workspaceId: '',
    clientId: '',
    startAtLocal: createStartAtLocal,
    endAtLocal: createEndAtLocal,
    notes: '',
    status: 0,
  });
  const anchorDay = useMemo(() => getScheduleAnchorDay(form.startAtLocal, selectedDay), [form.startAtLocal, selectedDay]);
  const selectableDays = useMemo(() => getSelectableScheduleDays(scheduleMode, anchorDay), [anchorDay, scheduleMode]);
  const [selectedDayKeys, setSelectedDayKeys] = useState<string[]>(() => [toDayKey(selectedDay)]);

  useEffect(() => {
    let isActive = true;

    const loadFormData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        if (mode === 'edit') {
          const [nextSessions, nextClients, nextWorkspaces] = await Promise.all([
            getJson<Session[]>(`${apiBaseUrl}/sessions`, authenticatedFetch, t('sessions.loadFailed')),
            getJson<Client[]>(`${apiBaseUrl}/clients`, authenticatedFetch, t('clients.loadFailed')),
            getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, t('workspaces.loadFailed')),
          ]);

          if (!isActive) {
            return;
          }

          const session = nextSessions.find((item) => item.id === sessionId) ?? null;
          setClients(nextClients);
          setWorkspaces(nextWorkspaces);
          setEditingSession(session);

          if (session) {
            setForm({
              workspaceId: session.workspaceId,
              clientId: session.clientId,
              startAtLocal: toDateTimeLocalValue(session.startAtUtc),
              endAtLocal: toDateTimeLocalValue(session.endAtUtc),
              notes: session.notes ?? '',
              status: session.status,
            });
          } else {
            setErrorMessage(t('calendar.sessionNotFound'));
          }
        } else {
          const [nextClients, nextWorkspaces] = await Promise.all([
            getJson<Client[]>(`${apiBaseUrl}/clients`, authenticatedFetch, t('clients.loadFailed')),
            getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, t('workspaces.loadFailed')),
          ]);

          if (!isActive) {
            return;
          }

          setClients(nextClients);
          setWorkspaces(nextWorkspaces);
          setEditingSession(null);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(toMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadFormData();

    return () => {
      isActive = false;
    };
  }, [apiBaseUrl, authenticatedFetch, mode, sessionId, t]);

  useEffect(() => {
    if (mode !== 'create') {
      return;
    }

    setForm((current) => {
      const nextStartAtLocal = combineDayAndTime(selectedDay, extractTime(current.startAtLocal) ?? '09:00');
      const nextEndAtLocal = combineDayAndTime(selectedDay, extractTime(current.endAtLocal) ?? '10:00');

      if (nextStartAtLocal === current.startAtLocal && nextEndAtLocal === current.endAtLocal) {
        return current;
      }

      return {
        ...current,
        startAtLocal: nextStartAtLocal,
        endAtLocal: nextEndAtLocal,
      };
    });
  }, [mode, selectedDay]);

  useEffect(() => {
    if (mode !== 'create') {
      return;
    }

    setSelectedDayKeys((current) => syncSelectedDayKeys(scheduleMode, anchorDay, current));
  }, [anchorDay, mode, scheduleMode]);

  const handleChange =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = field === 'status' ? Number(event.target.value) : event.target.value;

      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleToggleDay = (dayKey: string) => {
    if (scheduleMode === 'single') {
      return;
    }

    setSelectedDayKeys((current) =>
      current.includes(dayKey) ? current.filter((item) => item !== dayKey) : [...current, dayKey],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.workspaceId || !form.clientId || !form.startAtLocal || !form.endAtLocal) {
      setErrorMessage(t('calendar.formRequired'));
      return;
    }

    if (mode === 'create' && scheduleMode !== 'single' && selectedDayKeys.length === 0) {
      setErrorMessage(t('sessions.scheduleDatesRequired'));
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const payload = {
        workspaceId: form.workspaceId,
        clientId: form.clientId,
        notes: form.notes.trim() || null,
        startAtUtc: new Date(form.startAtLocal).toISOString(),
        endAtUtc: new Date(form.endAtLocal).toISOString(),
        status: form.status,
      };

      if (mode === 'edit' && editingSession) {
        await sendJson(
          `${apiBaseUrl}/sessions/${editingSession.id}`,
          'PUT',
          authenticatedFetch,
          payload,
          t('calendar.updateFailed'),
        );

        if (editingSession.status !== form.status) {
          await sendPatch(
            `${apiBaseUrl}/sessions/${editingSession.id}/status`,
            authenticatedFetch,
            { status: form.status },
            t('calendar.updateStatusFailed'),
          );
        }
      } else {
        if (scheduleMode === 'single') {
          await sendJson(`${apiBaseUrl}/sessions`, 'POST', authenticatedFetch, payload, t('calendar.createFailed'));
        } else {
          const startTime = extractTime(form.startAtLocal);
          const endTime = extractTime(form.endAtLocal);

          if (!startTime || !endTime) {
            throw new Error(t('calendar.formRequired'));
          }

          const selectedKeys = new Set(selectedDayKeys);
          const sessions = selectableDays
            .filter((day) => selectedKeys.has(toDayKey(day)))
            .map((day) => ({
              startAtUtc: new Date(combineDayAndTime(day, startTime)).toISOString(),
              endAtUtc: new Date(combineDayAndTime(day, endTime)).toISOString(),
            }));

          await sendJson(
            `${apiBaseUrl}/sessions/bulk`,
            'POST',
            authenticatedFetch,
            {
              workspaceId: form.workspaceId,
              clientId: form.clientId,
              notes: form.notes.trim() || null,
              status: form.status,
              sessions,
            },
            t('calendar.createFailed'),
          );
        }
      }

      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate(`/calendar/day/${toDayKey(anchorDay)}`);
      }
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="calendar-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">{t('calendar.formEyebrow')}</p>
          <h2>{mode === 'edit' ? t('calendar.editSession') : t('calendar.createSession')}</h2>
          <p>{selectedDay.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button type="button" className="button button--ghost page-back-button" onClick={() => navigate(-1)}>
          {t('common.back')}
        </button>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <section className="card calendar-day-panel">
        {isLoading ? (
          <p className="exercise-page__state">{t('common.loadingForm')}</p>
        ) : (
          <form className="exercise-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="calendar-workspace">{t('common.workspace')}</label>
              <select id="calendar-workspace" value={form.workspaceId} onChange={handleChange('workspaceId')}>
                <option value="">{t('common.chooseWorkspace')}</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="calendar-client">{t('common.client')}</label>
              <select id="calendar-client" value={form.clientId} onChange={handleChange('clientId')}>
                <option value="">{t('common.chooseClient')}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {formatClientName(client)}
                  </option>
                ))}
              </select>
            </div>

            <div className="calendar-form__times">
              <div className="field">
                <label htmlFor="calendar-start">{t('common.start')}</label>
                <input id="calendar-start" type="datetime-local" value={form.startAtLocal} onChange={handleChange('startAtLocal')} />
              </div>
              <div className="field">
                <label htmlFor="calendar-end">{t('common.end')}</label>
                <input id="calendar-end" type="datetime-local" value={form.endAtLocal} onChange={handleChange('endAtLocal')} />
              </div>
            </div>

            {mode === 'create' ? (
              <section className="session-schedule" aria-labelledby="calendar-schedule-title">
                <div className="session-schedule__intro">
                  <div>
                    <p className="feature-page__eyebrow">{t('sessions.scheduleLabel')}</p>
                    <h3 id="calendar-schedule-title">{t('sessions.scheduleDays')}</h3>
                    <p>{t('sessions.scheduleHint')}</p>
                  </div>
                </div>

                <div className="session-schedule__modes" role="group" aria-label={t('sessions.scheduleLabel')}>
                  <button
                    type="button"
                    className={`session-schedule__mode ${scheduleMode === 'single' ? 'is-active' : ''}`}
                    aria-pressed={scheduleMode === 'single'}
                    onClick={() => setScheduleMode('single')}
                  >
                    {t('sessions.scheduleSingle')}
                  </button>
                  <button
                    type="button"
                    className={`session-schedule__mode ${scheduleMode === 'week' ? 'is-active' : ''}`}
                    aria-pressed={scheduleMode === 'week'}
                    onClick={() => setScheduleMode('week')}
                  >
                    {t('sessions.scheduleWeek')}
                  </button>
                  <button
                    type="button"
                    className={`session-schedule__mode ${scheduleMode === 'month' ? 'is-active' : ''}`}
                    aria-pressed={scheduleMode === 'month'}
                    onClick={() => setScheduleMode('month')}
                  >
                    {t('sessions.scheduleMonth')}
                  </button>
                </div>

                {scheduleMode !== 'single' ? (
                  <>
                    <div className="session-schedule__meta">
                      <strong>
                        {scheduleMode === 'week'
                          ? t('sessions.scheduleWeekRange', {
                              start: selectableDays[0]?.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) ?? '',
                              end: selectableDays[selectableDays.length - 1]?.toLocaleDateString(locale, {
                                month: 'short',
                                day: 'numeric',
                              }) ?? '',
                            })
                          : t('sessions.scheduleMonthRange', {
                              month: anchorDay.toLocaleDateString(locale, { month: 'long' }),
                              year: anchorDay.getFullYear(),
                            })}
                      </strong>
                      <span>{t('sessions.scheduleSelectedCount', { count: selectedDayKeys.length })}</span>
                    </div>

                    <div className="session-schedule__days">
                      {selectableDays.map((day) => {
                        const dayKey = toDayKey(day);
                        const isSelected = selectedDayKeys.includes(dayKey);
                        const isAnchor = dayKey === toDayKey(anchorDay);

                        return (
                          <button
                            key={dayKey}
                            type="button"
                            className={`session-schedule__day ${isSelected ? 'is-selected' : ''} ${isAnchor ? 'is-anchor' : ''}`}
                            aria-pressed={isSelected}
                            onClick={() => handleToggleDay(dayKey)}
                          >
                            <span>{day.toLocaleDateString(locale, { weekday: 'short' })}</span>
                            <strong>{day.getDate()}</strong>
                          </button>
                        );
                      })}
                    </div>

                    <p className="hint">{t('sessions.scheduleDaysHint')}</p>
                  </>
                ) : null}
              </section>
            ) : null}

            <div className="field">
              <label htmlFor="calendar-status">{t('common.status')}</label>
              <select id="calendar-status" value={form.status} onChange={handleChange('status')}>
                <option value={0}>{t('status.planned')}</option>
                <option value={1}>{t('status.completed')}</option>
                <option value={2}>{t('status.cancelled')}</option>
                <option value={3}>{t('status.noShow')}</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="calendar-notes">{t('common.notes')}</label>
              <textarea id="calendar-notes" rows={4} value={form.notes} onChange={handleChange('notes')} />
            </div>

            <button className="submit-button" type="submit" disabled={isSaving}>
              {isSaving
                ? t('common.saving')
                : mode === 'edit'
                  ? t('common.saveChanges')
                  : scheduleMode === 'single'
                    ? t('calendar.createSession')
                    : t('sessions.submitAddBulk')}
            </button>
          </form>
        )}
      </section>
    </section>
  );
}
