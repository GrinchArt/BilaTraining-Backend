import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { getJson, sendJson, sendPatch, toMessage } from '../../shared/api';
import { formatClientName } from '../../shared/client.utils';
import type { Client, Session, SessionStatus, Workspace } from '../../shared/models';
import { combineDayAndTime, startOfDay, toDateTimeLocalValue } from '../calendar/calendar.utils';

type SessionFormState = {
  workspaceId: string;
  clientId: string;
  notes: string;
  startAtLocal: string;
  endAtLocal: string;
  status: SessionStatus;
};

export function SessionFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const initialDay = useMemo(() => startOfDay(new Date()), []);
  const [clients, setClients] = useState<Client[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState<SessionFormState>({
    workspaceId: '',
    clientId: '',
    startAtLocal: combineDayAndTime(initialDay, '09:00'),
    endAtLocal: combineDayAndTime(initialDay, '10:00'),
    notes: '',
    status: 0,
  });

  useEffect(() => {
    let isActive = true;

    const loadFormData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [nextSessions, nextClients, nextWorkspaces] = await Promise.all([
          getJson<Session[]>(`${apiBaseUrl}/sessions`, authenticatedFetch, 'Failed to load sessions.'),
          getJson<Client[]>(`${apiBaseUrl}/clients`, authenticatedFetch, 'Failed to load clients.'),
          getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, 'Failed to load workspaces.'),
        ]);

        if (!isActive) {
          return;
        }

        setClients(nextClients);
        setWorkspaces(nextWorkspaces);

        if (mode !== 'edit') {
          setEditingSession(null);
          return;
        }

        const session = nextSessions.find((item) => item.id === sessionId) ?? null;
        setEditingSession(session);

        if (!session) {
          setErrorMessage('Session not found.');
          return;
        }

        setForm({
          workspaceId: session.workspaceId,
          clientId: session.clientId,
          startAtLocal: toDateTimeLocalValue(session.startAtUtc),
          endAtLocal: toDateTimeLocalValue(session.endAtUtc),
          notes: session.notes ?? '',
          status: session.status,
        });
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
  }, [apiBaseUrl, authenticatedFetch, mode, sessionId]);

  const handleChange =
    (field: keyof SessionFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = field === 'status' ? Number(event.target.value) : event.target.value;

      setForm((current) => ({
        ...current,
        [field]: value as SessionFormState[keyof SessionFormState],
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.workspaceId || !form.clientId || !form.startAtLocal || !form.endAtLocal) {
      setErrorMessage('Workspace, client, start time, and end time are required.');
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
        await sendJson(`${apiBaseUrl}/sessions/${editingSession.id}`, 'PUT', authenticatedFetch, payload, 'Failed to update session.');

        if (editingSession.status !== form.status) {
          await sendPatch(
            `${apiBaseUrl}/sessions/${editingSession.id}/status`,
            authenticatedFetch,
            { status: form.status },
            'Failed to update session status.',
          );
        }
      } else {
        await sendJson(`${apiBaseUrl}/sessions`, 'POST', authenticatedFetch, payload, 'Failed to create session.');
      }

      navigate('/sessions');
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="exercise-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">Sessions</p>
          <h2>{mode === 'edit' ? 'Edit session' : 'Add session'}</h2>
          <p>{mode === 'edit' ? 'Update the session on a standalone page.' : 'Create a new session from the sessions tab.'}</p>
        </div>
        <button type="button" className="button button--secondary" onClick={() => navigate('/sessions')}>
          Back
        </button>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <section className="card calendar-day-panel">
        {isLoading ? (
          <p className="exercise-page__state">Loading form...</p>
        ) : (
          <form className="exercise-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="session-workspace">Workspace</label>
              <select id="session-workspace" value={form.workspaceId} onChange={handleChange('workspaceId')}>
                <option value="">Choose workspace</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="session-client">Client</label>
              <select id="session-client" value={form.clientId} onChange={handleChange('clientId')}>
                <option value="">Choose client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {formatClientName(client)}
                  </option>
                ))}
              </select>
            </div>

            <div className="calendar-form__times">
              <div className="field">
                <label htmlFor="session-start">Start</label>
                <input id="session-start" type="datetime-local" value={form.startAtLocal} onChange={handleChange('startAtLocal')} />
              </div>
              <div className="field">
                <label htmlFor="session-end">End</label>
                <input id="session-end" type="datetime-local" value={form.endAtLocal} onChange={handleChange('endAtLocal')} />
              </div>
            </div>

            <div className="field">
              <label htmlFor="session-status">Status</label>
              <select id="session-status" value={form.status} onChange={handleChange('status')}>
                <option value={0}>Planned</option>
                <option value={1}>Completed</option>
                <option value={2}>Cancelled</option>
                <option value={3}>No show</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="session-notes">Notes</label>
              <textarea id="session-notes" rows={4} value={form.notes} onChange={handleChange('notes')} />
            </div>

            <button className="submit-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create session'}
            </button>
          </form>
        )}
      </section>
    </section>
  );
}
