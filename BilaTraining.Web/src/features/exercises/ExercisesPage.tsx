import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { getJson, sendJson, sendVoid, toMessage } from '../../shared/api';
import type { Exercise } from '../../shared/models';

type ExerciseFormState = {
  name: string;
  category: string;
  notes: string;
};

const emptyForm: ExerciseFormState = {
  name: '',
  category: '',
  notes: '',
};

export function ExercisesPage() {
  const PAGE_SIZE = 25;
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  const activeExercise = useMemo(
    () => exercises.find((exercise) => exercise.id === activeExerciseId) ?? null,
    [activeExerciseId, exercises],
  );

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await getJson<Exercise[]>(`${apiBaseUrl}/exercises`, authenticatedFetch, t('exercises.loadFailed'));
      setExercises(data);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch, t]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

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
    if (!activeExerciseId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveExerciseId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeExerciseId]);

  const filteredExercises = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) {
      return exercises;
    }

    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(normalizedQuery));
  }, [exercises, search]);

  const totalPages = Math.max(Math.ceil(filteredExercises.length / PAGE_SIZE), 1);
  const pagedExercises = useMemo(
    () => filteredExercises.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredExercises, page],
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const handleDelete = async (exercise: Exercise) => {
    setIsDeletingId(exercise.id);
    setOpenMenuId(null);
    setActiveExerciseId((current) => (current === exercise.id ? null : current));
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/exercises/${exercise.id}`, 'DELETE', authenticatedFetch, t('exercises.deleteFailed'));
      await loadExercises();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <section className="exercise-page exercises-page">
      <div className="exercise-page__header clients-page__header">
        <div>
          <h2>{t('exercises.title')}</h2>
        </div>
        <div className="exercise-page__section-actions">
          <span className="exercise-page__count">{filteredExercises.length}</span>
          <button type="button" className="exercise-page__count-button" aria-label={t('exercises.add')} onClick={() => navigate('/exercises/new')}>
            +
          </button>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid exercise-page__grid--single">
        <section className="clients-panel">
          <div className="field">
            <label htmlFor="exercise-search">{t('exercises.searchLabel')}</label>
            <input id="exercise-search" type="search" placeholder={t('exercises.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          {isLoading ? <p className="exercise-page__state">{t('exercises.loading')}</p> : null}
          {!isLoading && filteredExercises.length === 0 ? (
            <p className="exercise-page__state">{exercises.length === 0 ? t('exercises.empty') : t('exercises.emptySearch')}</p>
          ) : null}
          {!isLoading && filteredExercises.length > 0 ? (
            <>
              <div className="client-list">
                {pagedExercises.map((exercise) => (
                  <article key={exercise.id} className="client-list__item">
                    <button type="button" className="client-list__trigger" onClick={() => setActiveExerciseId(exercise.id)}>
                      <div className="exercise-list__primary">
                        <strong>{exercise.name}</strong>
                        {exercise.category ? <span className="exercise-item__tag">{exercise.category}</span> : null}
                      </div>
                    </button>
                    <div className="data-table__menu">
                      <button
                        type="button"
                        className="data-table__menu-trigger"
                        aria-label={t('exercises.openActions', { name: exercise.name })}
                        aria-expanded={openMenuId === exercise.id}
                        onClick={() => setOpenMenuId((current) => (current === exercise.id ? null : exercise.id))}
                      >
                        ...
                      </button>
                      {openMenuId === exercise.id ? (
                        <div className="data-table__menu-popover">
                          <button
                            type="button"
                            className="data-table__menu-item"
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate(`/exercises/${exercise.id}/edit`);
                            }}
                          >
                            {t('common.edit')}
                          </button>
                          <button type="button" className="data-table__menu-item data-table__menu-item--danger" disabled={isDeletingId === exercise.id} onClick={() => void handleDelete(exercise)}>
                            {isDeletingId === exercise.id ? t('common.deleting') : t('common.delete')}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>

              {filteredExercises.length > PAGE_SIZE ? (
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

      {activeExercise ? (
        <div className="client-modal" role="dialog" aria-modal="true" aria-labelledby="exercise-modal-title">
          <button type="button" className="client-modal__scrim" aria-label={t('common.close')} onClick={() => setActiveExerciseId(null)} />

          <section className="card client-modal__card">
            <div className="client-modal__header">
              <div>
                <h3 id="exercise-modal-title">{activeExercise.name}</h3>
              </div>

              <button type="button" className="client-modal__close" aria-label={t('common.close')} onClick={() => setActiveExerciseId(null)}>
                x
              </button>
            </div>

            <div className="client-modal__body">
              <div className="client-modal__field">
                <p className="client-modal__label">{t('common.category')}</p>
                {activeExercise.category ? <span className="exercise-item__tag">{activeExercise.category}</span> : <p className="exercise-item__muted">{t('common.noCategory')}</p>}
              </div>

              <div className="client-modal__field">
                <p className="client-modal__label">{t('common.notes')}</p>
                <p className={activeExercise.notes ? undefined : 'exercise-item__muted'}>{activeExercise.notes ?? t('common.noNotes')}</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export function ExerciseFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const [form, setForm] = useState<ExerciseFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (mode !== 'edit') {
      setForm(emptyForm);
      return;
    }

    let isActive = true;

    const loadExercise = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const exercises = await getJson<Exercise[]>(`${apiBaseUrl}/exercises`, authenticatedFetch, t('exercises.loadFailed'));

        if (!isActive) {
          return;
        }

        const exercise = exercises.find((item) => item.id === exerciseId);

        if (!exercise) {
          setErrorMessage(t('exercises.notFound'));
          return;
        }

        setForm({
          name: exercise.name,
          category: exercise.category ?? '',
          notes: exercise.notes ?? '',
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

    void loadExercise();

    return () => {
      isActive = false;
    };
  }, [apiBaseUrl, authenticatedFetch, exerciseId, mode, t]);

  const handleChange =
    (field: keyof ExerciseFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setErrorMessage(t('exercises.nameRequired'));
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (mode === 'edit' && exerciseId) {
        await sendJson(`${apiBaseUrl}/exercises/${exerciseId}`, 'PUT', authenticatedFetch, payload, t('exercises.updateFailed'));
      } else {
        await sendJson(`${apiBaseUrl}/exercises`, 'POST', authenticatedFetch, payload, t('exercises.createFailed'));
      }

      navigate('/exercises');
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="exercise-page entity-form-page">
      <button type="button" className="button button--ghost page-back-button" onClick={() => navigate('/exercises')}>
        {t('common.back')}
      </button>

      <div className="exercise-page__header entity-form-page__header">
        <div>
          <h2>{mode === 'edit' ? t('exercises.editTitle') : t('exercises.addTitle')}</h2>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      {isLoading ? (
        <p className="exercise-page__state">{t('common.loadingForm')}</p>
      ) : (
        <form className="exercise-form entity-form-page__form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="exercise-name">{t('common.name')}</label>
            <input id="exercise-name" type="text" value={form.name} onChange={handleChange('name')} />
          </div>

          <div className="field">
            <label htmlFor="exercise-category">{t('common.category')}</label>
            <input id="exercise-category" type="text" value={form.category} onChange={handleChange('category')} />
          </div>

          <div className="field">
            <label htmlFor="exercise-notes">{t('common.notes')}</label>
            <textarea id="exercise-notes" rows={4} value={form.notes} onChange={handleChange('notes')} />
          </div>

          <button className="submit-button" type="submit" disabled={isSaving}>
            {isSaving ? t('common.saving') : mode === 'edit' ? t('common.saveChanges') : t('exercises.submitAdd')}
          </button>
        </form>
      )}
    </section>
  );
}
