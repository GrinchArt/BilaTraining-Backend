import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
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
  const { t } = useI18n();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, t('workspaces.loadFailed'));
      setWorkspaces(data);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch, t]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('.data-table__menu')) {
        return;
      }

      setOpenMenuId(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  const filteredWorkspaces = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) {
      return workspaces;
    }

    return workspaces.filter((workspace) => workspace.name.toLowerCase().includes(normalizedQuery));
  }, [search, workspaces]);

  const handleDelete = async (workspace: Workspace) => {
    setIsDeletingId(workspace.id);
    setOpenMenuId(null);
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/workspaces/${workspace.id}`, 'DELETE', authenticatedFetch, t('workspaces.deleteFailed'));
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
          <p className="feature-page__eyebrow">{t('nav.workspaces')}</p>
          <h2>{t('workspaces.title')}</h2>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid exercise-page__grid--single">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>{t('workspaces.list')}</h3>
            <div className="exercise-page__section-actions">
              <span className="exercise-page__count">{filteredWorkspaces.length}</span>
              <button type="button" className="exercise-page__count-button" aria-label={t('workspaces.add')} onClick={() => navigate('/workspaces/new')}>
                +
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="workspace-search">{t('workspaces.searchLabel')}</label>
            <input id="workspace-search" type="search" placeholder={t('workspaces.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          {isLoading ? <p className="exercise-page__state">{t('workspaces.loading')}</p> : null}
          {!isLoading && filteredWorkspaces.length === 0 ? (
            <p className="exercise-page__state">{workspaces.length === 0 ? t('workspaces.empty') : t('workspaces.emptySearch')}</p>
          ) : null}
          {!isLoading && filteredWorkspaces.length > 0 ? (
            <div className="data-table data-table--workspaces">
              <div className="data-table__header" aria-hidden="true">
                <span>{t('common.workspace')}</span>
                <span>{t('common.description')}</span>
                <span></span>
              </div>
              {filteredWorkspaces.map((workspace) => (
                <article key={workspace.id} className="data-table__row">
                  <div className="data-table__cell" data-label={t('common.workspace')}>
                    <div className="data-table__primary">
                      <span className="workspace-item__swatch" style={{ backgroundColor: normalizeColorHex(workspace.colorHex) }} aria-hidden="true"></span>
                      <strong>{workspace.name}</strong>
                    </div>
                  </div>
                  <div className="data-table__cell" data-label={t('common.description')}>
                    <span className={workspace.description ? undefined : 'exercise-item__muted'}>{workspace.description ?? t('common.noDescription')}</span>
                  </div>
                  <div className="data-table__cell data-table__cell--actions">
                    <div className="data-table__menu">
                      <button
                        type="button"
                        className="data-table__menu-trigger"
                        aria-label={t('workspaces.openActions', { name: workspace.name })}
                        aria-expanded={openMenuId === workspace.id}
                        onClick={() => setOpenMenuId((current) => (current === workspace.id ? null : workspace.id))}
                      >
                        ...
                      </button>
                      {openMenuId === workspace.id ? (
                        <div className="data-table__menu-popover">
                          <button
                            type="button"
                            className="data-table__menu-item"
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate(`/workspaces/${workspace.id}/edit`);
                            }}
                          >
                            {t('common.edit')}
                          </button>
                          <button type="button" className="data-table__menu-item data-table__menu-item--danger" disabled={isDeletingId === workspace.id} onClick={() => void handleDelete(workspace)}>
                            {isDeletingId === workspace.id ? t('common.deleting') : t('common.delete')}
                          </button>
                        </div>
                      ) : null}
                    </div>
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
  const { t } = useI18n();
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
        const workspaces = await getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, t('workspaces.loadFailed'));

        if (!isActive) {
          return;
        }

        const workspace = workspaces.find((item) => item.id === workspaceId);

        if (!workspace) {
          setErrorMessage(t('workspaces.notFound'));
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
  }, [apiBaseUrl, authenticatedFetch, mode, t, workspaceId]);

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
      setErrorMessage(t('workspaces.nameRequired'));
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
        await sendJson(`${apiBaseUrl}/workspaces/${workspaceId}`, 'PUT', authenticatedFetch, payload, t('workspaces.updateFailed'));
      } else {
        await sendJson(`${apiBaseUrl}/workspaces`, 'POST', authenticatedFetch, payload, t('workspaces.createFailed'));
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
          <p className="feature-page__eyebrow">{t('nav.workspaces')}</p>
          <h2>{mode === 'edit' ? t('workspaces.editTitle') : t('workspaces.addTitle')}</h2>
          <p>{mode === 'edit' ? t('workspaces.editDescription') : t('workspaces.addDescription')}</p>
        </div>
        <button type="button" className="button button--secondary" onClick={() => navigate('/workspaces')}>
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
              <label htmlFor="workspace-name">{t('common.name')}</label>
              <input id="workspace-name" type="text" value={form.name} onChange={handleChange('name')} />
            </div>

            <div className="field">
              <label htmlFor="workspace-description">{t('common.description')}</label>
              <textarea id="workspace-description" rows={4} value={form.description} onChange={handleChange('description')} />
            </div>

            <div className="field">
              <label htmlFor="workspace-color">{t('common.color')}</label>
              <div className="workspace-color-field">
                <input id="workspace-color" className="workspace-color-field__picker" type="color" value={normalizeColorHex(form.colorHex)} onChange={handleChange('colorHex')} />
                <span className="workspace-color-field__value">{normalizeColorHex(form.colorHex)}</span>
              </div>
            </div>

            <button className="submit-button" type="submit" disabled={isSaving}>
              {isSaving ? t('common.saving') : mode === 'edit' ? t('common.saveChanges') : t('workspaces.submitAdd')}
            </button>
          </form>
        )}
      </section>
    </section>
  );
}
