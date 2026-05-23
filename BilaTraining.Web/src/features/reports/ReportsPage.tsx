import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../auth';
import { type TranslationKey, useI18n } from '../../i18n';
import { getJson, toMessage } from '../../shared/api';
import type { ReportPeriod, SessionOverviewReport, SessionOverviewStatus, SessionOverviewTimelinePoint } from '../../shared/models';
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
  const [anchorDate, setAnchorDate] = useState(() => toDateOnlyString(new Date()));
  const [report, setReport] = useState<SessionOverviewReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const search = new URLSearchParams({
        period,
        anchorDate,
        timeZone,
      });

      const nextReport = await getJson<SessionOverviewReport>(
        `${apiBaseUrl}/reports/sessions-overview?${search.toString()}`,
        authenticatedFetch,
        t('reports.loadFailed'),
      );

      setReport(nextReport);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [anchorDate, apiBaseUrl, authenticatedFetch, period, t, timeZone]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const maxTimelineTotal = useMemo(
    () => Math.max(...(report?.timeline.map((point) => point.total) ?? [0]), 1),
    [report],
  );

  const visibleRangeLabel = useMemo(() => {
    if (!report) {
      return '';
    }

    const startDate = parseDateOnly(report.period.startDate);
    const endDate = parseDateOnly(report.period.endDate);

    return `${startDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }, [locale, report]);

  const handleMovePeriod = (direction: 'prev' | 'next') => {
    if (!report) {
      return;
    }

    setAnchorDate(direction === 'prev' ? report.period.previousAnchorDate : report.period.nextAnchorDate);
  };

  return (
    <section className="reports-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">{t('nav.reports')}</p>
          <h2>{t('reports.title')}</h2>
          <p>{t('reports.description')}</p>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

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
            <button type="button" className="button button--secondary" onClick={() => handleMovePeriod('prev')} disabled={!report || isLoading}>
              {t('common.prev')}
            </button>
            <div className="reports-range-nav__label">
              <strong>{visibleRangeLabel || t('reports.loadingPeriod')}</strong>
              <span>{report?.period.timeZone ?? timeZone}</span>
            </div>
            <button type="button" className="button button--secondary" onClick={() => handleMovePeriod('next')} disabled={!report || isLoading}>
              {t('common.next')}
            </button>
          </div>
        </div>

        {isLoading ? <p className="exercise-page__state">{t('reports.loading')}</p> : null}

        {!isLoading && report ? (
          <div className="reports-layout">
            <div className="reports-kpis">
              <article className="reports-kpi reports-kpi--total">
                <span className="reports-kpi__label">{t('reports.totalSessions')}</span>
                <strong>{report.summary.total}</strong>
              </article>
              <article className="reports-kpi reports-kpi--planned">
                <span className="reports-kpi__label">{t('status.planned')}</span>
                <strong>{report.summary.planned}</strong>
              </article>
              <article className="reports-kpi reports-kpi--completed">
                <span className="reports-kpi__label">{t('status.completed')}</span>
                <strong>{report.summary.completed}</strong>
              </article>
              <article className="reports-kpi reports-kpi--cancelled">
                <span className="reports-kpi__label">{t('status.cancelled')}</span>
                <strong>{report.summary.cancelled}</strong>
              </article>
              <article className="reports-kpi reports-kpi--no-show">
                <span className="reports-kpi__label">{t('status.noShow')}</span>
                <strong>{report.summary.noShow}</strong>
              </article>
            </div>

            <div className="reports-grid">
              <section className="reports-card">
                <div className="reports-card__header">
                  <div>
                    <h3>{t('reports.dailyTimeline')}</h3>
                    <p>{t('reports.dailyTimelineDescription')}</p>
                  </div>
                </div>

                <div className="reports-chart">
                  {report.timeline.map((point) => (
                    <TimelineBar key={point.date} point={point} maxTotal={maxTimelineTotal} locale={locale} />
                  ))}
                </div>
              </section>

              <section className="reports-card">
                <div className="reports-card__header">
                  <div>
                    <h3>{t('reports.statusBreakdown')}</h3>
                    <p>{t('reports.statusBreakdownDescription')}</p>
                  </div>
                </div>

                <div className="reports-status-list">
                  {report.byStatus.map((item) => (
                    <StatusRow key={item.status} item={item} total={report.summary.total} t={t} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function TimelineBar({ point, maxTotal, locale }: { point: SessionOverviewTimelinePoint; maxTotal: number; locale: string }) {
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
