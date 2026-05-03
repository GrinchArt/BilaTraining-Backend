import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

import { useAuth } from '../../auth';
import { getJson, sendJson, sendVoid, toMessage } from '../../shared/api';
import { normalizeColorHex } from '../../shared/color';
import type { Workspace } from '../../shared/models';

type WorkspaceFormState = {
  name: string;
  description: string;
  colorHex: string;
};

export function WorkspacesPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkspaceFormState>({
    name: '',
    description: '',
    colorHex: '#2575ff',
  });

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

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      colorHex: '#2575ff',
    });
  };

  const handleChange =
    (field: keyof WorkspaceFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleEdit = (workspace: Workspace) => {
    setEditingId(workspace.id);
    setErrorMessage('');
    setForm({
      name: workspace.name,
      description: workspace.description ?? '',
      colorHex: normalizeColorHex(workspace.colorHex),
    });
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
      if (editingId) {
        await sendJson(`${apiBaseUrl}/workspaces/${editingId}`, 'PUT', authenticatedFetch, payload, 'Failed to update workspace.');
      } else {
        await sendJson(`${apiBaseUrl}/workspaces`, 'POST', authenticatedFetch, payload, 'Failed to create workspace.');
      }

      resetForm();
      await loadWorkspaces();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (workspace: Workspace) => {
    setIsDeletingId(workspace.id);
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/workspaces/${workspace.id}`, 'DELETE', authenticatedFetch, 'Failed to delete workspace.');

      if (editingId === workspace.id) {
        resetForm();
      }

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
          <p>Create mobile-friendly training spaces and keep them visually distinct with a color marker.</p>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>{editingId ? 'Edit workspace' : 'Add workspace'}</h3>
            {editingId ? (
              <button type="button" className="button button--secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>

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
              {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add workspace'}
            </button>
          </form>
        </section>

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
                    <button type="button" className="button button--secondary" onClick={() => handleEdit(workspace)}>
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
