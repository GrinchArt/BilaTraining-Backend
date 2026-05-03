import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
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
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await getJson<Exercise[]>(`${apiBaseUrl}/exercises`, authenticatedFetch, 'Failed to load exercises.');
      setExercises(data);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  const filteredExercises = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) {
      return exercises;
    }

    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(normalizedQuery));
  }, [exercises, search]);

  const handleDelete = async (exercise: Exercise) => {
    setIsDeletingId(exercise.id);
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/exercises/${exercise.id}`, 'DELETE', authenticatedFetch, 'Failed to delete exercise.');
      await loadExercises();
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
          <p className="feature-page__eyebrow">Exercises</p>
          <h2>Exercises</h2>
          <p>Keep the library as a searchable list and move create or edit flows to separate screens.</p>
        </div>
        <div className="calendar-toolbar">
          <button type="button" className="button" aria-label="Add exercise" onClick={() => navigate('/exercises/new')}>
            +
          </button>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid exercise-page__grid--single">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>Library</h3>
            <span className="exercise-page__count">{filteredExercises.length}</span>
          </div>

          <div className="field">
            <label htmlFor="exercise-search">Search by name</label>
            <input id="exercise-search" type="search" placeholder="Start typing a name" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          {isLoading ? <p className="exercise-page__state">Loading exercises...</p> : null}
          {!isLoading && filteredExercises.length === 0 ? (
            <p className="exercise-page__state">{exercises.length === 0 ? 'No exercises yet.' : 'No exercises match the current search.'}</p>
          ) : null}
          {!isLoading && filteredExercises.length > 0 ? (
            <div className="exercise-list">
              {filteredExercises.map((exercise) => (
                <article key={exercise.id} className="exercise-item">
                  <div className="exercise-item__content">
                    <div className="exercise-item__title-row">
                      <h4>{exercise.name}</h4>
                      {exercise.category ? <span className="exercise-item__tag">{exercise.category}</span> : null}
                    </div>
                    {exercise.notes ? <p>{exercise.notes}</p> : <p className="exercise-item__muted">No notes.</p>}
                  </div>

                  <div className="exercise-item__actions">
                    <button type="button" className="button button--secondary" onClick={() => navigate(`/exercises/${exercise.id}/edit`)}>
                      Edit
                    </button>
                    <button type="button" className="button button--danger" disabled={isDeletingId === exercise.id} onClick={() => void handleDelete(exercise)}>
                      {isDeletingId === exercise.id ? 'Deleting...' : 'Delete'}
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

export function ExerciseFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
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
        const exercises = await getJson<Exercise[]>(`${apiBaseUrl}/exercises`, authenticatedFetch, 'Failed to load exercises.');

        if (!isActive) {
          return;
        }

        const exercise = exercises.find((item) => item.id === exerciseId);

        if (!exercise) {
          setErrorMessage('Exercise not found.');
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
  }, [apiBaseUrl, authenticatedFetch, exerciseId, mode]);

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
      setErrorMessage('Exercise name is required.');
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
        await sendJson(`${apiBaseUrl}/exercises/${exerciseId}`, 'PUT', authenticatedFetch, payload, 'Failed to update exercise.');
      } else {
        await sendJson(`${apiBaseUrl}/exercises`, 'POST', authenticatedFetch, payload, 'Failed to create exercise.');
      }

      navigate('/exercises');
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
          <p className="feature-page__eyebrow">Exercises</p>
          <h2>{mode === 'edit' ? 'Edit exercise' : 'Add exercise'}</h2>
          <p>{mode === 'edit' ? 'Update an exercise on a standalone screen.' : 'Create a new exercise on a standalone screen.'}</p>
        </div>
        <button type="button" className="button button--secondary" onClick={() => navigate('/exercises')}>
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
              <label htmlFor="exercise-name">Name</label>
              <input id="exercise-name" type="text" value={form.name} onChange={handleChange('name')} />
            </div>

            <div className="field">
              <label htmlFor="exercise-category">Category</label>
              <input id="exercise-category" type="text" value={form.category} onChange={handleChange('category')} />
            </div>

            <div className="field">
              <label htmlFor="exercise-notes">Notes</label>
              <textarea id="exercise-notes" rows={4} value={form.notes} onChange={handleChange('notes')} />
            </div>

            <button className="submit-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Add exercise'}
            </button>
          </form>
        )}
      </section>
    </section>
  );
}
