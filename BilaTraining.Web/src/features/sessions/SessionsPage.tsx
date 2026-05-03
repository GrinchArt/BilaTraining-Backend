import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

import { useAuth } from '../../auth';
import { formatSessionWindow, sessionStatusLabel, toDateTimeLocalValue } from '../calendar/calendar.utils';
import { getJson, sendJson, sendPatch, sendVoid, toMessage } from '../../shared/api';
import { emptyClient, formatClientName } from '../../shared/client.utils';
import type { Client, Session, SessionStatus, Workspace } from '../../shared/models';

type SessionFormState = {
  workspaceId: string;
  clientId: string;
  notes: string;
  startAtLocal: string;
  endAtLocal: string;
  status: SessionStatus;
};

export function SessionsPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | `${SessionStatus}`>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState<SessionFormState>({
    workspaceId: '',
    clientId: '',
    notes: '',
    startAtLocal: '',
    endAtLocal: '',
    status: 0,
  });

  const workspaceById = useMemo(
    () => new Map(workspaces.map((workspace) => [workspace.id, workspace])),
    [workspaces],
  );
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  const applySelection = useCallback((session: Session | null) => {
    if (!session) {
      setSelectedId(null);
      setForm({
        workspaceId: '',
        clientId: '',
        notes: '',
        startAtLocal: '',
        endAtLocal: '',
        status: 0,
      });
      return;
    }

    setSelectedId(session.id);
    setForm({
      workspaceId: session.workspaceId,
      clientId: session.clientId,
      notes: session.notes ?? '',
      startAtLocal: toDateTimeLocalValue(session.startAtUtc),
      endAtLocal: toDateTimeLocalValue(session.endAtUtc),
      status: session.status,
    });
  }, []);

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

      setSelectedId((current) => {
        const preferred = current ? nextSessions.find((session) => session.id === current) : null;
        const nextSelected = preferred ?? nextSessions[0] ?? null;
        applySelection(nextSelected);
        return nextSelected?.id ?? null;
      });
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, applySelection, authenticatedFetch]);

  useEffect(() => {
    void loadSessionsPage();
  }, [loadSessionsPage]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return sessions.filter((session) => {
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

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedId) ?? null,
    [selectedId, sessions],
  );

  const handleFormChange =
    (field: keyof SessionFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = field === 'status' ? Number(event.target.value) : event.target.value;

      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSelectSession = (session: Session) => {
    setErrorMessage('');
    applySelection(session);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSession) {
      setErrorMessage('Choose a session first.');
      return;
    }

    if (!form.workspaceId || !form.clientId || !form.startAtLocal || !form.endAtLocal) {
      setErrorMessage('Workspace, client, start time, and end time are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      await sendJson(
        `${apiBaseUrl}/sessions/${selectedSession.id}`,
        'PUT',
        authenticatedFetch,
        {
          workspaceId: form.workspaceId,
          clientId: form.clientId,
          notes: form.notes.trim() || null,
          startAtUtc: new Date(form.startAtLocal).toISOString(),
          endAtUtc: new Date(form.endAtLocal).toISOString(),
        },
        'Failed to update session.',
      );

      if (selectedSession.status !== form.status) {
        await sendPatch(
          `${apiBaseUrl}/sessions/${selectedSession.id}/status`,
          authenticatedFetch,
          { status: form.status },
          'Failed to update session status.',
        );
      }

      await loadSessionsPage();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

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
          <p>Review upcoming and past sessions, edit their details, and keep status changes aligned with the calendar.</p>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid">
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

          {!isLoading && filteredSessions.length === 0 ? (
            <p className="exercise-page__state">No sessions match the current filters.</p>
          ) : null}

          {!isLoading && filteredSessions.length > 0 ? (
            <div className="exercise-list">
              {filteredSessions.map((session) => {
                const client = clientById.get(session.clientId);
                const workspace = workspaceById.get(session.workspaceId);
                const isActive = session.id === selectedId;

                return (
                  <article key={session.id} className="exercise-item">
                    <div className="exercise-item__content">
                      <div className="exercise-item__title-row">
                        <h4>{workspace?.name ?? 'Unknown workspace'}</h4>
                      </div>

                      <div className="client-item__meta">
                        <span>{client ? formatClientName(client) : 'Unknown client'}</span>
                        <span>{sessionStatusLabel(session.status)}</span>
                      </div>

                      <p>{formatSessionWindow(session.startAtUtc, session.endAtUtc)}</p>
                      {session.notes ? <p>{session.notes}</p> : <p className="exercise-item__muted">No notes.</p>}
                    </div>

                    <div className="exercise-item__actions">
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => handleSelectSession(session)}
                      >
                        {isActive ? 'Selected' : 'Open'}
                      </button>
                      <button
                        type="button"
                        className="button button--danger"
                        disabled={isDeletingId === session.id}
                        onClick={() => void handleDelete(session)}
                      >
                        {isDeletingId === session.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="card">
          <div className="exercise-page__section-header">
            <h3>Session details</h3>
          </div>

          {!selectedSession ? (
            <p className="exercise-page__state">Sessions are created from the calendar. Pick one from the list to review or edit it here.</p>
          ) : (
            <form className="exercise-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="session-workspace">Workspace</label>
                <select id="session-workspace" value={form.workspaceId} onChange={handleFormChange('workspaceId')}>
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
                <select id="session-client" value={form.clientId} onChange={handleFormChange('clientId')}>
                  <option value="">Choose client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {formatClientName(client)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="session-start">Start</label>
                <input id="session-start" type="datetime-local" value={form.startAtLocal} onChange={handleFormChange('startAtLocal')} />
              </div>

              <div className="field">
                <label htmlFor="session-end">End</label>
                <input id="session-end" type="datetime-local" value={form.endAtLocal} onChange={handleFormChange('endAtLocal')} />
              </div>

              <div className="field">
                <label htmlFor="session-status">Status</label>
                <select id="session-status" value={form.status} onChange={handleFormChange('status')}>
                  <option value={0}>Planned</option>
                  <option value={1}>Completed</option>
                  <option value={2}>Cancelled</option>
                  <option value={3}>No show</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="session-notes">Notes</label>
                <textarea id="session-notes" rows={5} value={form.notes} onChange={handleFormChange('notes')} />
              </div>

              <button className="submit-button" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}
