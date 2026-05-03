import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

import { useAuth } from '../../auth';
import { getJson, sendJson, sendVoid, toMessage } from '../../shared/api';
import type { Exercise } from '../../shared/models';

type ExerciseFormState = {
  name: string;
  category: string;
  notes: string;
};

export function ExercisesPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExerciseFormState>({
    name: '',
    category: '',
    notes: '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadExercises = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await getJson<Exercise[]>(`${apiBaseUrl}/exercises`, authenticatedFetch, 'Failed to load exercises.');

        if (isMounted) {
          setExercises(data);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(toMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadExercises();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, authenticatedFetch]);

  const filteredExercises = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) {
      return exercises;
    }

    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(normalizedQuery));
  }, [exercises, search]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      category: '',
      notes: '',
    });
  };

  const handleChange =
    (field: keyof ExerciseFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleEdit = (exercise: Exercise) => {
    setEditingId(exercise.id);
    setErrorMessage('');
    setForm({
      name: exercise.name,
      category: exercise.category ?? '',
      notes: exercise.notes ?? '',
    });
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
      if (editingId) {
        await sendJson(`${apiBaseUrl}/exercises/${editingId}`, 'PUT', authenticatedFetch, payload, 'Failed to update exercise.');

        setExercises((current) =>
          current
            .map((exercise) =>
              exercise.id === editingId
                ? {
                    ...exercise,
                    name: payload.name,
                    category: payload.category,
                    notes: payload.notes,
                  }
                : exercise,
            )
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
      } else {
        const created = await sendJson<Exercise>(`${apiBaseUrl}/exercises`, 'POST', authenticatedFetch, payload, 'Failed to create exercise.');

        if (!created) {
          throw new Error('Failed to create exercise.');
        }

        setExercises((current) => [...current, created].sort((left, right) => left.name.localeCompare(right.name)));
      }

      resetForm();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (exercise: Exercise) => {
    setIsDeletingId(exercise.id);
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/exercises/${exercise.id}`, 'DELETE', authenticatedFetch, 'Failed to delete exercise.');
      setExercises((current) => current.filter((item) => item.id !== exercise.id));

      if (editingId === exercise.id) {
        resetForm();
      }
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
          <p>Manage your exercise library, update existing entries, and filter it by name.</p>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>{editingId ? 'Edit exercise' : 'Add exercise'}</h3>
            {editingId ? (
              <button type="button" className="button button--secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>

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
              {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add exercise'}
            </button>
          </form>
        </section>

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
                    <button type="button" className="button button--secondary" onClick={() => handleEdit(exercise)}>
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
