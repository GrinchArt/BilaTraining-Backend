import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { getJson, sendJson, sendPatch, toMessage } from '../../shared/api';
import { formatClientName } from '../../shared/client.utils';
import type { Client, Session, SessionStatus, Workspace } from '../../shared/models';
import { combineDayAndTime, extractTime, parseDayKey, startOfDay, toDateTimeLocalValue, toDayKey } from './calendar.utils';

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

  const handleChange =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = field === 'status' ? Number(event.target.value) : event.target.value;

      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.workspaceId || !form.clientId || !form.startAtLocal || !form.endAtLocal) {
      setErrorMessage(t('calendar.formRequired'));
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
        await sendJson(`${apiBaseUrl}/sessions`, 'POST', authenticatedFetch, payload, t('calendar.createFailed'));
      }

      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate(`/calendar/day/${toDayKey(selectedDay)}`);
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
        <button type="button" className="button button--secondary" onClick={() => navigate(-1)}>
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
              {isSaving ? t('common.saving') : mode === 'edit' ? t('common.saveChanges') : t('calendar.createSession')}
            </button>
          </form>
        )}
      </section>
    </section>
  );
}
