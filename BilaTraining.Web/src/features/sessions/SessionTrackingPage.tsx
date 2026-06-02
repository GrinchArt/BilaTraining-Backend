import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import type { TranslationKey } from '../../i18n';
import { useI18n } from '../../i18n';
import { getJson, sendJson, sendVoid, toMessage } from '../../shared/api';
import { formatClientName } from '../../shared/client.utils';
import type { Client, Exercise, Session, SessionExercise, SessionExerciseSet, Workspace } from '../../shared/models';
import { formatSessionWindow, sessionStatusLabel } from '../calendar/calendar.utils';

type SessionExerciseWithSets = SessionExercise & {
  exercise: Exercise | null;
  sets: SessionExerciseSet[];
};

type SetFormValues = {
  repetitions: string;
  weight: string;
  weightUnit: string;
  notes: string;
};

const emptySetForm: SetFormValues = {
  repetitions: '',
  weight: '',
  weightUnit: 'kg',
  notes: '',
};

export function SessionTrackingPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const { dayKey, sessionId } = useParams<{ dayKey: string; sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [setsByExerciseId, setSetsByExerciseId] = useState<Record<string, SessionExerciseSet[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [savingSetKey, setSavingSetKey] = useState<string | null>(null);
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);
  const [removingExerciseId, setRemovingExerciseId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const workspaceById = useMemo(() => new Map(workspaces.map((workspace) => [workspace.id, workspace])), [workspaces]);
  const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);

  const trackedExercises = useMemo<SessionExerciseWithSets[]>(
    () =>
      sessionExercises.map((sessionExercise) => ({
        ...sessionExercise,
        exercise: exerciseById.get(sessionExercise.exerciseId) ?? null,
        sets: setsByExerciseId[sessionExercise.id] ?? [],
      })),
    [exerciseById, sessionExercises, setsByExerciseId],
  );

  const availableExercises = useMemo(
    () => exercises.filter((exercise) => !sessionExercises.some((item) => item.exerciseId === exercise.id)),
    [exercises, sessionExercises],
  );

  const sessionClient = session ? clientById.get(session.clientId) : null;
  const sessionWorkspace = session ? workspaceById.get(session.workspaceId) : null;

  const loadTracking = useCallback(
    async (showBusy = false) => {
      if (!sessionId) {
        return;
      }

      if (showBusy) {
        setIsRefreshing(true);
      }

      try {
        const nextSessionExercises = await getJson<SessionExercise[]>(
          `${apiBaseUrl}/sessions/${sessionId}/exercises`,
          authenticatedFetch,
          t('tracking.loadFailed'),
        );

        const setEntries = await Promise.all(
          nextSessionExercises.map(async (sessionExercise) => [
            sessionExercise.id,
            await getJson<SessionExerciseSet[]>(
              `${apiBaseUrl}/session-exercises/${sessionExercise.id}/sets`,
              authenticatedFetch,
              t('tracking.loadFailed'),
            ),
          ] as const),
        );

        setSessionExercises(nextSessionExercises);
        setSetsByExerciseId(Object.fromEntries(setEntries));
      } catch (error) {
        setErrorMessage(toMessage(error));
      } finally {
        if (showBusy) {
          setIsRefreshing(false);
        }
      }
    },
    [apiBaseUrl, authenticatedFetch, sessionId, t],
  );

  useEffect(() => {
    if (!sessionId) {
      setErrorMessage(t('sessions.notFound'));
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const loadPage = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [nextSession, nextClients, nextWorkspaces, nextExercises] = await Promise.all([
          getJson<Session>(`${apiBaseUrl}/sessions/${sessionId}`, authenticatedFetch, t('sessions.loadFailed')),
          getJson<Client[]>(`${apiBaseUrl}/clients`, authenticatedFetch, t('clients.loadFailed')),
          getJson<Workspace[]>(`${apiBaseUrl}/workspaces`, authenticatedFetch, t('workspaces.loadFailed')),
          getJson<Exercise[]>(`${apiBaseUrl}/exercises`, authenticatedFetch, t('exercises.loadFailed')),
        ]);

        if (!isActive) {
          return;
        }

        setSession(nextSession);
        setClients(nextClients);
        setWorkspaces(nextWorkspaces);
        setExercises(nextExercises);

        const nextSessionExercises = await getJson<SessionExercise[]>(
          `${apiBaseUrl}/sessions/${sessionId}/exercises`,
          authenticatedFetch,
          t('tracking.loadFailed'),
        );

        const setEntries = await Promise.all(
          nextSessionExercises.map(async (sessionExercise) => [
            sessionExercise.id,
            await getJson<SessionExerciseSet[]>(
              `${apiBaseUrl}/session-exercises/${sessionExercise.id}/sets`,
              authenticatedFetch,
              t('tracking.loadFailed'),
            ),
          ] as const),
        );

        if (!isActive) {
          return;
        }

        setSessionExercises(nextSessionExercises);
        setSetsByExerciseId(Object.fromEntries(setEntries));
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

    void loadPage();

    return () => {
      isActive = false;
    };
  }, [apiBaseUrl, authenticatedFetch, sessionId, t]);

  useEffect(() => {
    if (!selectedExerciseId && availableExercises.length > 0) {
      setSelectedExerciseId(availableExercises[0].id);
    }

    if (selectedExerciseId && !availableExercises.some((exercise) => exercise.id === selectedExerciseId)) {
      setSelectedExerciseId(availableExercises[0]?.id ?? '');
    }
  }, [availableExercises, selectedExerciseId]);

  const handleAddExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sessionId) {
      return;
    }

    if (!selectedExerciseId) {
      setErrorMessage(t('tracking.exerciseRequired'));
      return;
    }

    setIsAddingExercise(true);
    setErrorMessage('');

    try {
      const nextSortOrder = Math.max(...sessionExercises.map((item) => item.sortOrder), -1) + 1;

      await sendJson(
        `${apiBaseUrl}/sessions/${sessionId}/exercises`,
        'POST',
        authenticatedFetch,
        {
          exerciseId: selectedExerciseId,
          sortOrder: nextSortOrder,
          notes: null,
        },
        t('tracking.addExerciseFailed'),
      );

      await loadTracking(true);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsAddingExercise(false);
    }
  };

  const handleRemoveExercise = async (sessionExerciseId: string) => {
    setRemovingExerciseId(sessionExerciseId);
    setErrorMessage('');

    try {
      await sendVoid(
        `${apiBaseUrl}/session-exercises/${sessionExerciseId}`,
        'DELETE',
        authenticatedFetch,
        t('tracking.removeExerciseFailed'),
      );

      await loadTracking(true);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setRemovingExerciseId(null);
    }
  };

  const handleAddSet = async (sessionExerciseId: string, values: SetFormValues, nextSetNumber: number) => {
    setSavingSetKey(`${sessionExerciseId}:new`);
    setErrorMessage('');

    try {
      await sendJson(
        `${apiBaseUrl}/session-exercises/${sessionExerciseId}/sets`,
        'POST',
        authenticatedFetch,
        {
          setNumber: nextSetNumber,
          repetitions: parseOptionalInteger(values.repetitions),
          weight: parseOptionalDecimal(values.weight),
          weightUnit: values.weightUnit.trim() || null,
          notes: values.notes.trim() || null,
        },
        t('tracking.addSetFailed'),
      );

      await loadTracking(true);
    } catch (error) {
      setErrorMessage(toMessage(error));
      throw error;
    } finally {
      setSavingSetKey(null);
    }
  };

  const handleSaveSet = async (set: SessionExerciseSet, values: SetFormValues) => {
    setSavingSetKey(set.id);
    setErrorMessage('');

    try {
      await sendJson(
        `${apiBaseUrl}/session-exercise-sets/${set.id}`,
        'PUT',
        authenticatedFetch,
        {
          setNumber: set.setNumber,
          repetitions: parseOptionalInteger(values.repetitions),
          weight: parseOptionalDecimal(values.weight),
          weightUnit: values.weightUnit.trim() || null,
          notes: values.notes.trim() || null,
        },
        t('tracking.updateSetFailed'),
      );

      await loadTracking(true);
    } catch (error) {
      setErrorMessage(toMessage(error));
      throw error;
    } finally {
      setSavingSetKey(null);
    }
  };

  const handleDeleteSet = async (setId: string) => {
    setDeletingSetId(setId);
    setErrorMessage('');

    try {
      await sendVoid(
        `${apiBaseUrl}/session-exercise-sets/${setId}`,
        'DELETE',
        authenticatedFetch,
        t('tracking.deleteSetFailed'),
      );

      await loadTracking(true);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setDeletingSetId(null);
    }
  };

  const backTarget = dayKey ? `/calendar/day/${dayKey}` : '/calendar';

  return (
    <section className="exercise-page session-tracking-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">{t('tracking.title')}</p>
          <h2>{sessionClient ? formatClientName(sessionClient) : t('sessions.notFound')}</h2>
          <p>{t('tracking.description')}</p>
        </div>
        <button type="button" className="button button--secondary" onClick={() => navigate(backTarget)}>
          {t('common.back')}
        </button>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      {isLoading ? (
        <section className="card calendar-day-panel">
          <p className="exercise-page__state">{t('common.loadingForm')}</p>
        </section>
      ) : session ? (
        <>
          <section className="card session-tracking-summary">
            <div className="session-tracking-summary__meta">
              <div>
                <p className="feature-page__eyebrow">{t('common.session')}</p>
                <h3>{formatSessionWindow(session.startAtUtc, session.endAtUtc, locale)}</h3>
                <p>
                  {sessionWorkspace?.name ?? t('common.unknownWorkspace')}
                  {' / '}
                  {sessionStatusLabel(session.status, t)}
                </p>
              </div>
              {isRefreshing ? <span className="exercise-page__state">{t('tracking.refreshing')}</span> : null}
            </div>
          </section>

          <section className="card session-tracking-add">
            <div className="exercise-page__section-header">
              <h3>{t('tracking.addExerciseTitle')}</h3>
            </div>
            <p className="session-tracking-add__hint">{t('tracking.addExerciseHint')}</p>

            {availableExercises.length > 0 ? (
              <form className="session-tracking-add__form" onSubmit={handleAddExercise}>
                <div className="field">
                  <label htmlFor="tracking-exercise">{t('tracking.exerciseLabel')}</label>
                  <select id="tracking-exercise" value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)}>
                    {availableExercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="submit-button" type="submit" disabled={isAddingExercise}>
                  {isAddingExercise ? t('common.saving') : t('tracking.addExerciseSubmit')}
                </button>
              </form>
            ) : (
              <p className="exercise-page__state">{t('tracking.noExercisesAvailable')}</p>
            )}
          </section>

          <section className="session-tracking-exercises">
            {trackedExercises.length === 0 ? (
              <section className="card calendar-day-panel">
                <p className="exercise-page__state">{t('tracking.empty')}</p>
              </section>
            ) : (
              trackedExercises.map((sessionExercise) => (
                <article key={sessionExercise.id} className="card session-tracking-exercise-card">
                  <div className="session-tracking-exercise-card__header">
                    <div>
                      <p className="feature-page__eyebrow">{t('tracking.exerciseLabel')}</p>
                      <h3>{sessionExercise.exercise?.name ?? t('tracking.unknownExercise')}</h3>
                      <p>{sessionExercise.exercise?.category ?? t('common.noCategory')}</p>
                    </div>
                    <button
                      type="button"
                      className="button button--danger"
                      disabled={removingExerciseId === sessionExercise.id}
                      onClick={() => void handleRemoveExercise(sessionExercise.id)}
                    >
                      {removingExerciseId === sessionExercise.id ? t('common.deleting') : t('tracking.removeExercise')}
                    </button>
                  </div>

                  <div className="session-tracking-set-list">
                    <div className="exercise-page__section-header">
                      <h4>{t('tracking.setsTitle')}</h4>
                      <span className="exercise-page__count">{sessionExercise.sets.length}</span>
                    </div>

                    {sessionExercise.sets.length === 0 ? <p className="exercise-page__state">{t('tracking.noSets')}</p> : null}

                    {sessionExercise.sets.map((set) => (
                      <EditableSetRow
                        key={set.id}
                        set={set}
                        isSaving={savingSetKey === set.id}
                        isDeleting={deletingSetId === set.id}
                        onSave={handleSaveSet}
                        onDelete={handleDeleteSet}
                        t={t}
                      />
                    ))}

                    <NewSetRow
                      nextSetNumber={(sessionExercise.sets.at(-1)?.setNumber ?? 0) + 1}
                      isSaving={savingSetKey === `${sessionExercise.id}:new`}
                      onAdd={(values) => handleAddSet(sessionExercise.id, values, (sessionExercise.sets.at(-1)?.setNumber ?? 0) + 1)}
                      t={t}
                    />
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}

function EditableSetRow({
  set,
  isSaving,
  isDeleting,
  onSave,
  onDelete,
  t,
}: {
  set: SessionExerciseSet;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (set: SessionExerciseSet, values: SetFormValues) => Promise<void>;
  onDelete: (setId: string) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const [form, setForm] = useState<SetFormValues>(() => toSetForm(set));

  useEffect(() => {
    setForm(toSetForm(set));
  }, [set]);

  const handleChange =
    (field: keyof SetFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(set, form);
  };

  return (
    <form className="session-tracking-set-row" onSubmit={(event) => void handleSubmit(event)}>
      <div className="session-tracking-set-row__heading">
        <strong>{t('tracking.setLabel', { number: set.setNumber })}</strong>
      </div>

      <div className="session-tracking-set-grid">
        <div className="field">
          <label htmlFor={`set-reps-${set.id}`}>{t('tracking.repetitionsLabel')}</label>
          <input id={`set-reps-${set.id}`} type="number" min="1" value={form.repetitions} onChange={handleChange('repetitions')} />
        </div>
        <div className="field">
          <label htmlFor={`set-weight-${set.id}`}>{t('tracking.weightLabel')}</label>
          <input id={`set-weight-${set.id}`} type="number" min="0" step="0.25" value={form.weight} onChange={handleChange('weight')} />
        </div>
        <div className="field">
          <label htmlFor={`set-unit-${set.id}`}>{t('tracking.weightUnitLabel')}</label>
          <select id={`set-unit-${set.id}`} value={form.weightUnit} onChange={handleChange('weightUnit')}>
            <option value="kg">{t('tracking.unitKg')}</option>
            <option value="lb">{t('tracking.unitLb')}</option>
          </select>
        </div>
        <div className="field session-tracking-set-grid__notes">
          <label htmlFor={`set-notes-${set.id}`}>{t('common.notes')}</label>
          <input id={`set-notes-${set.id}`} type="text" value={form.notes} onChange={handleChange('notes')} />
        </div>
      </div>

      <div className="session-tracking-inline-actions">
        <button className="button" type="submit" disabled={isSaving}>
          {isSaving ? t('common.saving') : t('tracking.saveSet')}
        </button>
        <button className="button button--danger" type="button" disabled={isDeleting} onClick={() => void onDelete(set.id)}>
          {isDeleting ? t('common.deleting') : t('common.delete')}
        </button>
      </div>
    </form>
  );
}

function NewSetRow({
  nextSetNumber,
  isSaving,
  onAdd,
  t,
}: {
  nextSetNumber: number;
  isSaving: boolean;
  onAdd: (values: SetFormValues) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const [form, setForm] = useState<SetFormValues>(emptySetForm);

  const handleChange =
    (field: keyof SetFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onAdd(form);
    setForm(emptySetForm);
  };

  return (
    <form className="session-tracking-set-row session-tracking-set-row--new" onSubmit={(event) => void handleSubmit(event)}>
      <div className="session-tracking-set-row__heading">
        <strong>{t('tracking.setLabel', { number: nextSetNumber })}</strong>
      </div>

      <div className="session-tracking-set-grid">
        <div className="field">
          <label htmlFor={`new-set-reps-${nextSetNumber}`}>{t('tracking.repetitionsLabel')}</label>
          <input id={`new-set-reps-${nextSetNumber}`} type="number" min="1" value={form.repetitions} onChange={handleChange('repetitions')} />
        </div>
        <div className="field">
          <label htmlFor={`new-set-weight-${nextSetNumber}`}>{t('tracking.weightLabel')}</label>
          <input id={`new-set-weight-${nextSetNumber}`} type="number" min="0" step="0.25" value={form.weight} onChange={handleChange('weight')} />
        </div>
        <div className="field">
          <label htmlFor={`new-set-unit-${nextSetNumber}`}>{t('tracking.weightUnitLabel')}</label>
          <select id={`new-set-unit-${nextSetNumber}`} value={form.weightUnit} onChange={handleChange('weightUnit')}>
            <option value="kg">{t('tracking.unitKg')}</option>
            <option value="lb">{t('tracking.unitLb')}</option>
          </select>
        </div>
        <div className="field session-tracking-set-grid__notes">
          <label htmlFor={`new-set-notes-${nextSetNumber}`}>{t('common.notes')}</label>
          <input id={`new-set-notes-${nextSetNumber}`} type="text" value={form.notes} onChange={handleChange('notes')} />
        </div>
      </div>

      <div className="session-tracking-inline-actions">
        <button className="button" type="submit" disabled={isSaving}>
          {isSaving ? t('common.saving') : t('tracking.addSetSubmit')}
        </button>
      </div>
    </form>
  );
}

function toSetForm(set: SessionExerciseSet): SetFormValues {
  return {
    repetitions: set.repetitions?.toString() ?? '',
    weight: set.weight?.toString() ?? '',
    weightUnit: set.weightUnit ?? 'kg',
    notes: set.notes ?? '',
  };
}

function parseOptionalInteger(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalDecimal(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}
