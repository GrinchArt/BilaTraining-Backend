import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { getJson, sendJson, sendVoid, toMessage } from '../../shared/api';
import { normalizeColorHex } from '../../shared/color';
import type { Workspace } from '../../shared/models';

type WorkspaceFormState = {
  name: string;
  description: string;
  colorHex: string;
};

const emptyForm: WorkspaceFormState = {
  name: '',
  description: '',
  colorHex: '#2575ff',
};

export function WorkspacesPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, 'Failed to load workspaces.');
      setWorkspaces(data);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const filteredWorkspaces = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) {
      return workspaces;
    }

    return workspaces.filter((workspace) => workspace.name.toLowerCase().includes(normalizedQuery));
  }, [search, workspaces]);

  const handleDelete = async (workspace: Workspace) => {
    setIsDeletingId(workspace.id);
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/workspaces/${workspace.id}`, 'DELETE', authenticatedFetch, 'Failed to delete workspace.');
      await loadWorkspaces();
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
          <p className="feature-page__eyebrow">Workspaces</p>
          <h2>Workspaces</h2>
          <p>Open a separate screen to add or update a workspace instead of editing inside the list.</p>
        </div>
        <div className="calendar-toolbar">
          <button type="button" className="button" aria-label="Add workspace" onClick={() => navigate('/workspaces/new')}>
            +
          </button>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid exercise-page__grid--single">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>Workspace list</h3>
            <span className="exercise-page__count">{filteredWorkspaces.length}</span>
          </div>

          <div className="field">
            <label htmlFor="workspace-search">Search by name</label>
            <input id="workspace-search" type="search" placeholder="Start typing a workspace name" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          {isLoading ? <p className="exercise-page__state">Loading workspaces...</p> : null}
          {!isLoading && filteredWorkspaces.length === 0 ? (
            <p className="exercise-page__state">{workspaces.length === 0 ? 'No workspaces yet.' : 'No workspaces match the current search.'}</p>
          ) : null}
          {!isLoading && filteredWorkspaces.length > 0 ? (
            <div className="exercise-list">
              {filteredWorkspaces.map((workspace) => (
                <article key={workspace.id} className="exercise-item">
                  <div className="exercise-item__content">
                    <div className="exercise-item__title-row">
                      <span className="workspace-item__swatch" style={{ backgroundColor: normalizeColorHex(workspace.colorHex) }} aria-hidden="true"></span>
                      <h4>{workspace.name}</h4>
                    </div>
                    {workspace.description ? <p>{workspace.description}</p> : <p className="exercise-item__muted">No description.</p>}
                  </div>

                  <div className="exercise-item__actions">
                    <button type="button" className="button button--secondary" onClick={() => navigate(`/workspaces/${workspace.id}/edit`)}>
                      Edit
                    </button>
                    <button type="button" className="button button--danger" disabled={isDeletingId === workspace.id} onClick={() => void handleDelete(workspace)}>
                      {isDeletingId === workspace.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

export function WorkspaceFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [form, setForm] = useState<WorkspaceFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (mode !== 'edit') {
      setForm(emptyForm);
      return;
    }

    let isActive = true;

    const loadWorkspace = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const workspaces = await getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, 'Failed to load workspaces.');

        if (!isActive) {
          return;
        }

        const workspace = workspaces.find((item) => item.id === workspaceId);

        if (!workspace) {
          setErrorMessage('Workspace not found.');
          return;
        }

        setForm({
          name: workspace.name,
          description: workspace.description ?? '',
          colorHex: normalizeColorHex(workspace.colorHex),
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

    void loadWorkspace();

    return () => {
      isActive = false;
    };
  }, [apiBaseUrl, authenticatedFetch, mode, workspaceId]);

  const handleChange =
    (field: keyof WorkspaceFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setErrorMessage('Workspace name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      colorHex: form.colorHex.trim() || null,
    };

    try {
      if (mode === 'edit' && workspaceId) {
        await sendJson(`${apiBaseUrl}/workspaces/${workspaceId}`, 'PUT', authenticatedFetch, payload, 'Failed to update workspace.');
      } else {
        await sendJson(`${apiBaseUrl}/workspaces`, 'POST', authenticatedFetch, payload, 'Failed to create workspace.');
      }

      navigate('/workspaces');
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
          <p className="feature-page__eyebrow">Workspaces</p>
          <h2>{mode === 'edit' ? 'Edit workspace' : 'Add workspace'}</h2>
          <p>{mode === 'edit' ? 'Adjust workspace details on a dedicated page.' : 'Create a workspace on a dedicated page.'}</p>
        </div>
        <button type="button" className="button button--secondary" onClick={() => navigate('/workspaces')}>
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
              <label htmlFor="workspace-name">Name</label>
              <input id="workspace-name" type="text" value={form.name} onChange={handleChange('name')} />
            </div>

            <div className="field">
              <label htmlFor="workspace-description">Description</label>
              <textarea id="workspace-description" rows={4} value={form.description} onChange={handleChange('description')} />
            </div>

            <div className="field">
              <label htmlFor="workspace-color">Color</label>
              <div className="workspace-color-field">
                <input id="workspace-color" className="workspace-color-field__picker" type="color" value={normalizeColorHex(form.colorHex)} onChange={handleChange('colorHex')} />
                <span className="workspace-color-field__value">{normalizeColorHex(form.colorHex)}</span>
              </div>
            </div>

            <button className="submit-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Add workspace'}
            </button>
          </form>
        )}
      </section>
    </section>
  );
}
