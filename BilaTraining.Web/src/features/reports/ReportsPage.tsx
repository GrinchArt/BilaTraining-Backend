import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../auth';
import { type TranslationKey, useI18n } from '../../i18n';
import { getJson, toMessage } from '../../shared/api';
import type {
  Client,
  Exercise,
  ExerciseProgressReport,
  ExerciseProgressTimelinePoint,
  ReportPeriod,
  SessionOverviewReport,
  SessionOverviewStatus,
  SessionOverviewTimelinePoint,
} from '../../shared/models';
import { sessionStatusLabel } from '../calendar/calendar.utils';

const STATUS_META: Array<{ status: SessionOverviewStatus['status']; tone: string }> = [
  { status: 0, tone: 'planned' },
  { status: 1, tone: 'completed' },
  { status: 2, tone: 'cancelled' },
  { status: 3, tone: 'no-show' },
];

export function ReportsPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { locale, t } = useI18n();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'progress'>('overview');
  const [anchorDate, setAnchorDate] = useState(() => toDateOnlyString(new Date()));
  const [sessionReport, setSessionReport] = useState<SessionOverviewReport | null>(null);
  const [progressReport, setProgressReport] = useState<ExerciseProgressReport | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [selectedExerciseId, setSelectedExerciseId] = useState('all');
  const [isLoadingSessionReport, setIsLoadingSessionReport] = useState(true);
  const [isLoadingProgressReport, setIsLoadingProgressReport] = useState(true);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [catalogErrorMessage, setCatalogErrorMessage] = useState('');
  const [sessionErrorMessage, setSessionErrorMessage] = useState('');
  const [progressErrorMessage, setProgressErrorMessage] = useState('');

  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);

  const loadCatalogs = useCallback(async () => {
    setIsLoadingCatalogs(true);
    setCatalogErrorMessage('');

    try {
      const [nextClients, nextExercises] = await Promise.all([
        getJson<Client[]>(`${apiBaseUrl}/clients`, authenticatedFetch, t('clients.loadFailed')),
        getJson<Exercise[]>(`${apiBaseUrl}/exercises`, authenticatedFetch, t('exercises.loadFailed')),
      ]);

      setClients(nextClients);
      setExercises(nextExercises);
    } catch (error) {
      setCatalogErrorMessage(toMessage(error));
    } finally {
      setIsLoadingCatalogs(false);
    }
  }, [apiBaseUrl, authenticatedFetch, t]);

  const loadSessionReport = useCallback(async () => {
    setIsLoadingSessionReport(true);
    setSessionErrorMessage('');

    try {
      const overviewSearch = new URLSearchParams({
        period,
        anchorDate,
        timeZone,
      });

      const nextSessionReport = await getJson<SessionOverviewReport>(
        `${apiBaseUrl}/reports/sessions-overview?${overviewSearch.toString()}`,
        authenticatedFetch,
        t('reports.loadFailed'),
      );

      setSessionReport(nextSessionReport);
    } catch (error) {
      setSessionReport(null);
      setSessionErrorMessage(toMessage(error));
    } finally {
      setIsLoadingSessionReport(false);
    }
  }, [anchorDate, apiBaseUrl, authenticatedFetch, period, t, timeZone]);

  const loadProgressReport = useCallback(async () => {
    setIsLoadingProgressReport(true);
    setProgressErrorMessage('');

    try {
      const progressSearch = new URLSearchParams({
        period,
        anchorDate,
        timeZone,
      });

      if (selectedClientId !== 'all') {
        progressSearch.set('clientId', selectedClientId);
      }

      if (selectedExerciseId !== 'all') {
        progressSearch.set('exerciseId', selectedExerciseId);
      }

      const nextProgressReport = await getJson<ExerciseProgressReport>(
        `${apiBaseUrl}/reports/exercise-progress?${progressSearch.toString()}`,
        authenticatedFetch,
        t('reports.progressLoadFailed'),
      );

      setProgressReport(nextProgressReport);
    } catch (error) {
      setProgressReport(null);
      setProgressErrorMessage(toMessage(error));
    } finally {
      setIsLoadingProgressReport(false);
    }
  }, [anchorDate, apiBaseUrl, authenticatedFetch, period, selectedClientId, selectedExerciseId, t, timeZone]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    void loadSessionReport();
  }, [loadSessionReport]);

  useEffect(() => {
    void loadProgressReport();
  }, [loadProgressReport]);

  const maxSessionTimelineTotal = useMemo(
    () => Math.max(...(sessionReport?.timeline.map((point) => point.total) ?? [0]), 1),
    [sessionReport],
  );

  const maxProgressVolume = useMemo(
    () => Math.max(...(progressReport?.timeline.map((point) => point.totalVolume) ?? [0]), 1),
    [progressReport],
  );

  const visibleRangeLabel = useMemo(() => {
    const periodSource = sessionReport?.period ?? progressReport?.period;

    if (!periodSource) {
      return '';
    }

    const startDate = parseDateOnly(periodSource.startDate);
    const endDate = parseDateOnly(periodSource.endDate);

    return `${startDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }, [locale, progressReport, sessionReport]);

  const handleMovePeriod = (direction: 'prev' | 'next') => {
    const periodSource = sessionReport?.period ?? progressReport?.period;

    if (!periodSource) {
      return;
    }

    setAnchorDate(direction === 'prev' ? periodSource.previousAnchorDate : periodSource.nextAnchorDate);
  };

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;
  const periodSource = sessionReport?.period ?? progressReport?.period ?? null;
  const isLoadingAnyReport = isLoadingSessionReport || isLoadingProgressReport;
  const reportViewLabels = locale.startsWith('uk')
    ? { overview: '\u041e\u0433\u043b\u044f\u0434', progress: '\u041f\u0440\u043e\u0433\u0440\u0435\u0441' }
    : { overview: 'Overview', progress: 'Progress' };

  return (
    <section className="reports-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">{t('nav.reports')}</p>
          <h2>{t('reports.title')}</h2>
          <p>{t('reports.description')}</p>
        </div>
      </div>

      <section className="card reports-panel">
        <div className="reports-toolbar">
          <div className="reports-period-toggle" role="tablist" aria-label={t('reports.periodAria')}>
            <button
              type="button"
              className={`reports-period-toggle__button${period === 'week' ? ' is-active' : ''}`}
              onClick={() => setPeriod('week')}
            >
              {t('common.week')}
            </button>
            <button
              type="button"
              className={`reports-period-toggle__button${period === 'month' ? ' is-active' : ''}`}
              onClick={() => setPeriod('month')}
            >
              {t('common.month')}
            </button>
          </div>

          <div className="reports-range-nav">
            <button
              type="button"
              className="button button--ghost button--compact"
              onClick={() => handleMovePeriod('prev')}
              disabled={!periodSource || isLoadingAnyReport}
            >
              {t('common.prev')}
            </button>
            <div className="reports-range-nav__label">
              <strong>{visibleRangeLabel || t('reports.loadingPeriod')}</strong>
              <span>{periodSource?.timeZone ?? timeZone}</span>
            </div>
            <button
              type="button"
              className="button button--ghost button--compact"
              onClick={() => handleMovePeriod('next')}
              disabled={!periodSource || isLoadingAnyReport}
            >
              {t('common.next')}
            </button>
          </div>
        </div>

        <div className="reports-view-toggle" role="tablist" aria-label={t('nav.reports')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            className={`reports-view-toggle__button${activeTab === 'overview' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            {reportViewLabels.overview}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'progress'}
            className={`reports-view-toggle__button${activeTab === 'progress' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            {reportViewLabels.progress}
          </button>
        </div>

        {activeTab === 'overview' ? (
          <>
            {sessionErrorMessage ? <p className="feedback">{sessionErrorMessage}</p> : null}
            {isLoadingSessionReport ? <p className="exercise-page__state">{t('reports.loading')}</p> : null}
            {!isLoadingSessionReport && sessionReport ? (
              <div className="reports-layout">
                <div className="reports-kpis">
                  <article className="reports-kpi reports-kpi--total">
                    <span className="reports-kpi__label">{t('reports.totalSessions')}</span>
                    <strong>{sessionReport.summary.total}</strong>
                  </article>
                  <article className="reports-kpi reports-kpi--planned">
                    <span className="reports-kpi__label">{t('status.planned')}</span>
                    <strong>{sessionReport.summary.planned}</strong>
                  </article>
                  <article className="reports-kpi reports-kpi--completed">
                    <span className="reports-kpi__label">{t('status.completed')}</span>
                    <strong>{sessionReport.summary.completed}</strong>
                  </article>
                  <article className="reports-kpi reports-kpi--cancelled">
                    <span className="reports-kpi__label">{t('status.cancelled')}</span>
                    <strong>{sessionReport.summary.cancelled}</strong>
                  </article>
                  <article className="reports-kpi reports-kpi--no-show">
                    <span className="reports-kpi__label">{t('status.noShow')}</span>
                    <strong>{sessionReport.summary.noShow}</strong>
                  </article>
                </div>

                <div className="reports-grid">
                  <section className="reports-card">
                    <div className="reports-card__header">
                      <h3>{t('reports.dailyTimeline')}</h3>
                    </div>

                    <div className="reports-chart">
                      {sessionReport.timeline.map((point) => (
                        <SessionTimelineBar key={point.date} point={point} maxTotal={maxSessionTimelineTotal} locale={locale} />
                      ))}
                    </div>
                  </section>

                  <section className="reports-card">
                    <div className="reports-card__header">
                      <h3>{t('reports.statusBreakdown')}</h3>
                    </div>

                    <div className="reports-status-list">
                      {sessionReport.byStatus.map((item) => (
                        <StatusRow key={item.status} item={item} total={sessionReport.summary.total} t={t} />
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
            {!isLoadingSessionReport && !sessionReport && !sessionErrorMessage ? (
              <p className="exercise-page__state">{t('reports.loading')}</p>
            ) : null}
          </>
        ) : (
          <div className="reports-layout">
            <section className="reports-card reports-card--filters">
              <div className="reports-card__header">
                <div>
                  <h3>{t('reports.progressTitle')}</h3>
                  <p>
                    {selectedClient ? t('reports.progressClientHint', { client: formatClientOption(selectedClient) }) : t('reports.progressClientAll')}
                    {' '}
                    {selectedExercise ? t('reports.progressExerciseHint', { exercise: selectedExercise.name }) : t('reports.progressExerciseAll')}
                  </p>
                </div>
              </div>

              {catalogErrorMessage ? <p className="feedback">{catalogErrorMessage}</p> : null}

              <div className="reports-filters">
                <div className="field">
                  <label htmlFor="reports-client-filter">{t('reports.clientFilter')}</label>
                  <select
                    id="reports-client-filter"
                    value={selectedClientId}
                    onChange={(event) => setSelectedClientId(event.target.value)}
                    disabled={isLoadingCatalogs}
                  >
                    <option value="all">{t('reports.allClients')}</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {formatClientOption(client)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="reports-exercise-filter">{t('reports.exerciseFilter')}</label>
                  <select
                    id="reports-exercise-filter"
                    value={selectedExerciseId}
                    onChange={(event) => setSelectedExerciseId(event.target.value)}
                    disabled={isLoadingCatalogs}
                  >
                    <option value="all">{t('reports.allExercises')}</option>
                    {exercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {progressErrorMessage ? <p className="feedback">{progressErrorMessage}</p> : null}
            {isLoadingProgressReport ? <p className="exercise-page__state">{t('reports.loading')}</p> : null}
            {!isLoadingProgressReport && progressReport ? (
              <section className="reports-card">
                <div className="reports-kpis reports-kpis--progress">
                  <article className="reports-kpi reports-kpi--total">
                    <span className="reports-kpi__label">{t('reports.completedSessionsMetric')}</span>
                    <strong>{progressReport.summary.completedSessions}</strong>
                  </article>
                  <article className="reports-kpi reports-kpi--planned">
                    <span className="reports-kpi__label">{t('reports.totalSetsMetric')}</span>
                    <strong>{progressReport.summary.totalSets}</strong>
                  </article>
                  <article className="reports-kpi reports-kpi--completed">
                    <span className="reports-kpi__label">{t('reports.totalRepetitionsMetric')}</span>
                    <strong>{progressReport.summary.totalRepetitions}</strong>
                  </article>
                  <article className="reports-kpi reports-kpi--cancelled">
                    <span className="reports-kpi__label">{t('reports.totalVolumeMetric')}</span>
                    <strong>{formatNumber(progressReport.summary.totalVolume, locale)}</strong>
                  </article>
                  <article className="reports-kpi reports-kpi--no-show">
                    <span className="reports-kpi__label">{t('reports.maxWeightMetric')}</span>
                    <strong>{formatNumber(progressReport.summary.maxWeight, locale)}</strong>
                  </article>
                </div>

                {progressReport.summary.totalSets === 0 ? (
                  <p className="exercise-page__state">{t('reports.progressEmpty')}</p>
                ) : (
                  <div className="reports-chart reports-chart--progress">
                    {progressReport.timeline.map((point) => (
                      <ProgressTimelineBar key={point.date} point={point} maxVolume={maxProgressVolume} locale={locale} />
                    ))}
                  </div>
                )}
              </section>
            ) : null}
            {!isLoadingProgressReport && !progressReport && !progressErrorMessage ? (
              <p className="exercise-page__state">{t('reports.loading')}</p>
            ) : null}
          </div>
        )}
      </section>
    </section>
  );
}

function SessionTimelineBar({ point, maxTotal, locale }: { point: SessionOverviewTimelinePoint; maxTotal: number; locale: string }) {
  const totalHeightPercent = point.total > 0 ? (point.total / maxTotal) * 100 : 0;

  return (
    <div className="reports-chart__column">
      <div className="reports-chart__value">{point.total}</div>
      <div className="reports-chart__track">
        <div className="reports-chart__bar" style={{ height: `${Math.max(totalHeightPercent, point.total > 0 ? 8 : 0)}%` }}>
          {STATUS_META.map(({ status, tone }) => {
            const count = getStatusCount(point, status);

            if (count === 0 || point.total === 0) {
              return null;
            }

            return (
              <span
                key={status}
                className={`reports-chart__segment reports-chart__segment--${tone}`}
                style={{ height: `${(count / point.total) * 100}%` }}
              />
            );
          })}
        </div>
      </div>
      <div className="reports-chart__label">
        <strong>{parseDateOnly(point.date).getDate()}</strong>
        <span>{parseDateOnly(point.date).toLocaleDateString(locale, { weekday: 'short' })}</span>
      </div>
    </div>
  );
}

function ProgressTimelineBar({ point, maxVolume, locale }: { point: ExerciseProgressTimelinePoint; maxVolume: number; locale: string }) {
  const totalHeightPercent = point.totalVolume > 0 ? (point.totalVolume / maxVolume) * 100 : 0;
  const fallbackHeight = point.totalSets > 0 ? 8 : 0;

  return (
    <div className="reports-chart__column">
      <div className="reports-chart__value">{formatCompact(point.totalVolume, locale)}</div>
      <div className="reports-chart__track">
        <div className="reports-chart__bar" style={{ height: `${Math.max(totalHeightPercent, fallbackHeight)}%` }}>
          <span className="reports-chart__segment reports-chart__segment--progress" style={{ height: '100%' }} />
        </div>
      </div>
      <div className="reports-chart__label">
        <strong>{parseDateOnly(point.date).getDate()}</strong>
        <span>{`${point.totalRepetitions} reps`}</span>
      </div>
    </div>
  );
}

function StatusRow({ item, total, t }: { item: SessionOverviewStatus; total: number; t: (key: TranslationKey, params?: Record<string, string | number>) => string }) {
  const tone = STATUS_META.find((entry) => entry.status === item.status)?.tone ?? 'planned';
  const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;

  return (
    <article className="reports-status-row">
      <div className="reports-status-row__header">
        <span className={`reports-status-row__dot reports-status-row__dot--${tone}`} />
        <strong>{sessionStatusLabel(item.status, t)}</strong>
        <span>{item.count}</span>
      </div>
      <div className="reports-status-row__bar">
        <span className={`reports-status-row__fill reports-status-row__fill--${tone}`} style={{ width: `${percent}%` }} />
      </div>
      <p>{t('reports.percentOfAllSessions', { percent })}</p>
    </article>
  );
}

function getStatusCount(point: SessionOverviewTimelinePoint, status: SessionOverviewStatus['status']) {
  switch (status) {
    case 0:
      return point.planned;
    case 1:
      return point.completed;
    case 2:
      return point.cancelled;
    case 3:
      return point.noShow;
    default:
      return 0;
  }
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateOnlyString(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatClientOption(client: Client) {
  return client.lastName?.trim() ? `${client.firstName} ${client.lastName}` : client.firstName;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

function formatCompact(value: number, locale: string) {
  if (value === 0) {
    return '0';
  }

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
