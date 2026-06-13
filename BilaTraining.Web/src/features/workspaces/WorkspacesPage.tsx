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
  const PAGE_SIZE = 25;
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaces],
  );

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

  useEffect(() => {
    if (!activeWorkspaceId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveWorkspaceId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWorkspaceId]);

  const filteredWorkspaces = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) {
      return workspaces;
    }

    return workspaces.filter((workspace) => workspace.name.toLowerCase().includes(normalizedQuery));
  }, [search, workspaces]);
  const totalPages = Math.max(Math.ceil(filteredWorkspaces.length / PAGE_SIZE), 1);
  const pagedWorkspaces = useMemo(
    () => filteredWorkspaces.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredWorkspaces, page],
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const handleDelete = async (workspace: Workspace) => {
    setIsDeletingId(workspace.id);
    setOpenMenuId(null);
    setActiveWorkspaceId((current) => (current === workspace.id ? null : current));
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
    <section className="exercise-page workspaces-page">
      <div className="exercise-page__header clients-page__header">
        <div>
          <h2>{t('workspaces.title')}</h2>
        </div>
        <div className="exercise-page__section-actions">
          <span className="exercise-page__count">{filteredWorkspaces.length}</span>
          <button type="button" className="exercise-page__count-button" aria-label={t('workspaces.add')} onClick={() => navigate('/workspaces/new')}>
            +
          </button>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid exercise-page__grid--single">
        <section className="clients-panel">
          <div className="field">
            <label htmlFor="workspace-search">{t('workspaces.searchLabel')}</label>
            <input id="workspace-search" type="search" placeholder={t('workspaces.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          {isLoading ? <p className="exercise-page__state">{t('workspaces.loading')}</p> : null}
          {!isLoading && filteredWorkspaces.length === 0 ? (
            <p className="exercise-page__state">{workspaces.length === 0 ? t('workspaces.empty') : t('workspaces.emptySearch')}</p>
          ) : null}
          {!isLoading && filteredWorkspaces.length > 0 ? (
            <>
              <div className="client-list">
                {pagedWorkspaces.map((workspace) => (
                  <article key={workspace.id} className="client-list__item">
                    <button type="button" className="client-list__trigger" onClick={() => setActiveWorkspaceId(workspace.id)}>
                      <div className="data-table__primary">
                        <span className="workspace-item__swatch" style={{ backgroundColor: normalizeColorHex(workspace.colorHex) }} aria-hidden="true"></span>
                        <strong>{workspace.name}</strong>
                      </div>
                    </button>
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
                  </article>
                ))}
              </div>

              {filteredWorkspaces.length > PAGE_SIZE ? (
                <div className="list-pagination">
                  <button type="button" className="button button--ghost button--compact" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page === 1}>
                    {t('common.prev')}
                  </button>
                  <span className="list-pagination__label">
                    {page} / {totalPages}
                  </span>
                  <button type="button" className="button button--ghost button--compact" onClick={() => setPage((current) => Math.min(current + 1, totalPages))} disabled={page === totalPages}>
                    {t('common.next')}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      {activeWorkspace ? (
        <div className="client-modal" role="dialog" aria-modal="true" aria-labelledby="workspace-modal-title">
          <button type="button" className="client-modal__scrim" aria-label={t('common.close')} onClick={() => setActiveWorkspaceId(null)} />

          <section className="card client-modal__card">
            <div className="client-modal__header">
              <div className="workspace-modal__title">
                <span className="workspace-item__swatch" style={{ backgroundColor: normalizeColorHex(activeWorkspace.colorHex) }} aria-hidden="true"></span>
                <h3 id="workspace-modal-title">{activeWorkspace.name}</h3>
              </div>

              <button type="button" className="client-modal__close" aria-label={t('common.close')} onClick={() => setActiveWorkspaceId(null)}>
                x
              </button>
            </div>

            <div className="client-modal__body">
              <div className="client-modal__field">
                <p className="client-modal__label">{t('common.description')}</p>
                <p className={activeWorkspace.description ? undefined : 'exercise-item__muted'}>{activeWorkspace.description ?? t('common.noDescription')}</p>
              </div>

              <div className="client-modal__field">
                <p className="client-modal__label">{t('common.color')}</p>
                <p className="data-table__mono">{normalizeColorHex(activeWorkspace.colorHex)}</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
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
    <section className="exercise-page entity-form-page">
      <button type="button" className="button button--ghost page-back-button" onClick={() => navigate('/workspaces')}>
        {t('common.back')}
      </button>

      <div className="exercise-page__header entity-form-page__header">
        <div>
          <h2>{mode === 'edit' ? t('workspaces.editTitle') : t('workspaces.addTitle')}</h2>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      {isLoading ? (
        <p className="exercise-page__state">{t('common.loadingForm')}</p>
      ) : (
        <form className="exercise-form entity-form-page__form" onSubmit={handleSubmit}>
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
  );
}
