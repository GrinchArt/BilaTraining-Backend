import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { getJson, sendJson, sendVoid, toMessage } from '../../shared/api';
import type { BodyMeasurement } from '../../shared/models';

type MetricKey =
  | 'weightKg'
  | 'bodyFatPercent'
  | 'neckCm'
  | 'chestCm'
  | 'waistCm'
  | 'hipsCm'
  | 'bicepsCm'
  | 'thighCm'
  | 'calfCm'
  | 'bmi';

type FormState = {
  recordedOn: string;
  weightKg: string;
  heightCm: string;
  bodyFatPercent: string;
  neckCm: string;
  chestCm: string;
  waistCm: string;
  hipsCm: string;
  bicepsCm: string;
  thighCm: string;
  calfCm: string;
  notes: string;
};

const PERIOD_DAYS = { 30: 30, 90: 90, 180: 180, 365: 365, all: null } as const;
type PeriodKey = keyof typeof PERIOD_DAYS;

export function BodyMeasurementsPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { locale, t } = useI18n();
  const readOnly = Boolean(clientId);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('weightKg');
  const [period, setPeriod] = useState<PeriodKey>('90');
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const endpoint = readOnly
    ? `${apiBaseUrl}/clients/${clientId}/body-measurements`
    : `${apiBaseUrl}/my/body-measurements`;

  const load = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await getJson<BodyMeasurement[]>(endpoint, authenticatedFetch, t('measurements.loadFailed'));
      setMeasurements(data);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // The endpoint fully describes the current measurement scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const metricOptions = useMemo(
    () => [
      { key: 'weightKg' as const, label: t('measurements.weight'), unit: t('measurements.kg') },
      { key: 'bmi' as const, label: t('measurements.bmi'), unit: '' },
      { key: 'bodyFatPercent' as const, label: t('measurements.bodyFat'), unit: '%' },
      { key: 'neckCm' as const, label: t('measurements.neck'), unit: t('measurements.cm') },
      { key: 'chestCm' as const, label: t('measurements.chest'), unit: t('measurements.cm') },
      { key: 'waistCm' as const, label: t('measurements.waist'), unit: t('measurements.cm') },
      { key: 'hipsCm' as const, label: t('measurements.hips'), unit: t('measurements.cm') },
      { key: 'bicepsCm' as const, label: t('measurements.biceps'), unit: t('measurements.cm') },
      { key: 'thighCm' as const, label: t('measurements.thigh'), unit: t('measurements.cm') },
      { key: 'calfCm' as const, label: t('measurements.calf'), unit: t('measurements.cm') },
    ],
    [t],
  );

  const selectedOption = metricOptions.find((option) => option.key === selectedMetric)!;
  const chartPoints = useMemo(() => {
    const cutoff = PERIOD_DAYS[period] === null
      ? null
      : new Date(Date.now() - PERIOD_DAYS[period]! * 24 * 60 * 60 * 1000);

    return measurements
      .map((measurement) => ({
        date: measurement.recordedOn,
        value: readMetric(measurement, selectedMetric),
      }))
      .filter((point): point is { date: string; value: number } =>
        point.value !== null && (!cutoff || new Date(`${point.date}T00:00:00`) >= cutoff))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [measurements, period, selectedMetric]);

  const latest = measurements[0] ?? null;
  const latestWeight = latestMetric(measurements, 'weightKg');
  const latestWaist = latestMetric(measurements, 'waistCm');
  const latestBmi = latestMetric(measurements, 'bmi');
  const weightChange = metricChange(measurements, 'weightKg');

  const openCreate = () => {
    const lastHeight = latestMetric(measurements, 'heightCm');
    setEditingId(null);
    setForm(emptyForm(lastHeight?.value));
    setShowForm(true);
  };

  const openEdit = (measurement: BodyMeasurement) => {
    setEditingId(measurement.id);
    setForm(toForm(measurement));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setErrorMessage('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      const payload = toPayload(form);
      if (editingId) {
        await sendJson<never>(`${apiBaseUrl}/my/body-measurements/${editingId}`, 'PUT', authenticatedFetch, payload, t('measurements.saveFailed'));
      } else {
        await sendJson<BodyMeasurement>(`${apiBaseUrl}/my/body-measurements`, 'POST', authenticatedFetch, payload, t('measurements.saveFailed'));
      }
      closeForm();
      await load();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (measurement: BodyMeasurement) => {
    if (!window.confirm(t('measurements.deleteConfirm'))) return;

    setErrorMessage('');
    try {
      await sendVoid(`${apiBaseUrl}/my/body-measurements/${measurement.id}`, 'DELETE', authenticatedFetch, t('measurements.deleteFailed'));
      await load();
    } catch (error) {
      setErrorMessage(toMessage(error));
    }
  };

  return (
    <section className="measurements-page">
      <header className="measurements-page__header">
        <div>
          <p className="feature-page__eyebrow">{t(readOnly ? 'measurements.coachEyebrow' : 'measurements.eyebrow')}</p>
          <h2>{t(readOnly ? 'measurements.coachTitle' : 'measurements.title')}</h2>
          <p>{t(readOnly ? 'measurements.readOnlyDescription' : 'measurements.description')}</p>
        </div>
        <div className="measurements-page__header-actions">
          {readOnly ? (
            <button type="button" className="button button--ghost" onClick={() => navigate('/clients')}>
              {t('common.back')}
            </button>
          ) : (
            <button type="button" className="button" onClick={openCreate}>
              {t('measurements.add')}
            </button>
          )}
        </div>
      </header>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}
      {isLoading ? <p className="exercise-page__state">{t('measurements.loading')}</p> : null}

      {!isLoading ? (
        <>
          <section className="measurements-summary" aria-label={t('measurements.summary')}>
            <SummaryCard label={t('measurements.currentWeight')} value={formatMetric(latestWeight?.value, t('measurements.kg'), locale)} />
            <SummaryCard label={t('measurements.weightChange')} value={formatChange(weightChange, t('measurements.kg'), locale)} trend={weightChange} />
            <SummaryCard label={t('measurements.currentWaist')} value={formatMetric(latestWaist?.value, t('measurements.cm'), locale)} />
            <SummaryCard label={t('measurements.bmi')} value={formatMetric(latestBmi?.value, '', locale)} />
          </section>

          <section className="card measurements-chart-card">
            <div className="measurements-chart-card__header">
              <div>
                <p className="feature-page__eyebrow">{t('measurements.dynamics')}</p>
                <h3>{selectedOption.label}</h3>
              </div>
              <div className="measurements-chart-card__filters">
                <label>
                  <span>{t('measurements.metric')}</span>
                  <select value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value as MetricKey)}>
                    {metricOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>{t('measurements.period')}</span>
                  <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodKey)}>
                    <option value="30">{t('measurements.days30')}</option>
                    <option value="90">{t('measurements.days90')}</option>
                    <option value="180">{t('measurements.days180')}</option>
                    <option value="365">{t('measurements.year')}</option>
                    <option value="all">{t('measurements.allTime')}</option>
                  </select>
                </label>
              </div>
            </div>
            <MeasurementChart points={chartPoints} unit={selectedOption.unit} locale={locale} emptyLabel={t('measurements.noChartData')} />
          </section>

          <section className="measurements-history">
            <div className="measurements-history__header">
              <h3>{t('measurements.history')}</h3>
              <span>{measurements.length}</span>
            </div>
            {measurements.length === 0 ? (
              <article className="card measurements-empty">
                <h3>{t('measurements.emptyTitle')}</h3>
                <p>{t(readOnly ? 'measurements.emptyCoachDescription' : 'measurements.emptyDescription')}</p>
              </article>
            ) : (
              <div className="measurements-history__list">
                {measurements.map((measurement) => (
                  <MeasurementCard
                    key={measurement.id}
                    measurement={measurement}
                    readOnly={readOnly}
                    locale={locale}
                    t={t}
                    onEdit={() => openEdit(measurement)}
                    onDelete={() => void remove(measurement)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {!readOnly && showForm ? (
        <div className="measurement-form-modal" role="dialog" aria-modal="true" aria-labelledby="measurement-form-title">
          <button type="button" className="measurement-form-modal__scrim" aria-label={t('common.close')} onClick={closeForm} />
          <section className="card measurement-form-modal__card">
            <div className="measurement-form-modal__header">
              <div>
                <p className="feature-page__eyebrow">{t('measurements.eyebrow')}</p>
                <h3 id="measurement-form-title">{t(editingId ? 'measurements.editTitle' : 'measurements.addTitle')}</h3>
              </div>
              <button type="button" className="client-modal__close" aria-label={t('common.close')} onClick={closeForm}>x</button>
            </div>
            <MeasurementForm form={form} setForm={setForm} onSubmit={submit} isSaving={isSaving} t={t} />
          </section>
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value, trend }: { label: string; value: string; trend?: number | null }) {
  return (
    <article className="card measurements-summary__card">
      <span>{label}</span>
      <strong className={trend ? (trend < 0 ? 'is-down' : 'is-up') : undefined}>{value}</strong>
    </article>
  );
}

function MeasurementChart({ points, unit, locale, emptyLabel }: { points: { date: string; value: number }[]; unit: string; locale: string; emptyLabel: string }) {
  if (points.length === 0) return <div className="measurements-chart__empty">{emptyLabel}</div>;

  const width = 640;
  const height = 230;
  const paddingX = 34;
  const paddingY = 24;
  const values = points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = rawMax - rawMin || Math.max(rawMax * 0.08, 1);
  const min = rawMin - spread * 0.15;
  const max = rawMax + spread * 0.15;
  const x = (index: number) => paddingX + (points.length === 1 ? (width - paddingX * 2) / 2 : index * (width - paddingX * 2) / (points.length - 1));
  const y = (value: number) => height - paddingY - ((value - min) / (max - min)) * (height - paddingY * 2);
  const polyline = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`));

  return (
    <div className="measurements-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={emptyLabel}>
        {[0, 1, 2, 3].map((row) => {
          const gridY = paddingY + row * (height - paddingY * 2) / 3;
          return <line key={row} x1={paddingX} x2={width - paddingX} y1={gridY} y2={gridY} className="measurements-chart__grid" />;
        })}
        {points.length > 1 ? <polyline points={polyline} className="measurements-chart__line" /> : null}
        {points.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={x(index)} cy={y(point.value)} r="5" className="measurements-chart__point" />
            <title>{`${formatDate(point.date)}: ${point.value.toLocaleString(locale)} ${unit}`}</title>
          </g>
        ))}
      </svg>
      <div className="measurements-chart__labels">
        <span>{formatDate(points[0].date)}</span>
        <strong>{points.at(-1)!.value.toLocaleString(locale)} {unit}</strong>
        <span>{formatDate(points.at(-1)!.date)}</span>
      </div>
    </div>
  );
}

function MeasurementCard({ measurement, readOnly, locale, t, onEdit, onDelete }: {
  measurement: BodyMeasurement;
  readOnly: boolean;
  locale: string;
  t: ReturnType<typeof useI18n>['t'];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const values = [
    [t('measurements.weight'), measurement.weightKg, t('measurements.kg')],
    [t('measurements.height'), measurement.heightCm, t('measurements.cm')],
    [t('measurements.bodyFat'), measurement.bodyFatPercent, '%'],
    [t('measurements.neck'), measurement.neckCm, t('measurements.cm')],
    [t('measurements.chest'), measurement.chestCm, t('measurements.cm')],
    [t('measurements.waist'), measurement.waistCm, t('measurements.cm')],
    [t('measurements.hips'), measurement.hipsCm, t('measurements.cm')],
    [t('measurements.biceps'), measurement.bicepsCm, t('measurements.cm')],
    [t('measurements.thigh'), measurement.thighCm, t('measurements.cm')],
    [t('measurements.calf'), measurement.calfCm, t('measurements.cm')],
  ] as const;

  return (
    <article className="card measurement-entry">
      <header>
        <strong>{new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(`${measurement.recordedOn}T00:00:00`))}</strong>
        {!readOnly ? (
          <div className="measurement-entry__actions">
            <button type="button" className="button button--ghost button--compact" onClick={onEdit}>{t('common.edit')}</button>
            <button type="button" className="button button--danger button--compact" onClick={onDelete}>{t('common.delete')}</button>
          </div>
        ) : null}
      </header>
      <div className="measurement-entry__values">
        {values.filter(([, value]) => value !== null).map(([label, value, unit]) => (
          <div key={label}><span>{label}</span><strong>{value!.toLocaleString(locale)} {unit}</strong></div>
        ))}
      </div>
      {measurement.notes ? <p className="measurement-entry__notes">{measurement.notes}</p> : null}
    </article>
  );
}

function MeasurementForm({ form, setForm, onSubmit, isSaving, t }: {
  form: FormState;
  setForm: (value: FormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const fields = [
    ['weightKg', t('measurements.weight'), t('measurements.kg'), 1, 1000],
    ['heightCm', t('measurements.height'), t('measurements.cm'), 30, 300],
    ['bodyFatPercent', t('measurements.bodyFat'), '%', 0, 100],
    ['neckCm', t('measurements.neck'), t('measurements.cm'), 1, 500],
    ['chestCm', t('measurements.chest'), t('measurements.cm'), 1, 500],
    ['waistCm', t('measurements.waist'), t('measurements.cm'), 1, 500],
    ['hipsCm', t('measurements.hips'), t('measurements.cm'), 1, 500],
    ['bicepsCm', t('measurements.biceps'), t('measurements.cm'), 1, 500],
    ['thighCm', t('measurements.thigh'), t('measurements.cm'), 1, 500],
    ['calfCm', t('measurements.calf'), t('measurements.cm'), 1, 500],
  ] as const;

  return (
    <form className="measurement-form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="measurement-date">{t('measurements.date')}</label>
        <input id="measurement-date" type="date" max={today()} required value={form.recordedOn} onChange={(event) => setForm({ ...form, recordedOn: event.target.value })} />
      </div>
      <div className="measurement-form__grid">
        {fields.map(([key, label, unit, min, max]) => (
          <div className="field" key={key}>
            <label htmlFor={`measurement-${key}`}>{label}, {unit}</label>
            <input
              id={`measurement-${key}`}
              type="number"
              inputMode="decimal"
              min={min}
              max={max}
              step="0.1"
              value={form[key]}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="field">
        <label htmlFor="measurement-notes">{t('common.notes')}</label>
        <textarea id="measurement-notes" maxLength={1000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        <small>{t('measurements.notesVisible')}</small>
      </div>
      <button className="submit-button" type="submit" disabled={isSaving}>
        {isSaving ? t('common.saving') : t('common.saveChanges')}
      </button>
    </form>
  );
}

function readMetric(measurement: BodyMeasurement, metric: MetricKey | 'heightCm'): number | null {
  if (metric === 'bmi') {
    if (!measurement.weightKg || !measurement.heightCm) return null;
    return Math.round((measurement.weightKg / ((measurement.heightCm / 100) ** 2)) * 10) / 10;
  }
  return measurement[metric];
}

function latestMetric(measurements: BodyMeasurement[], metric: MetricKey | 'heightCm') {
  for (const measurement of measurements) {
    const value = readMetric(measurement, metric);
    if (value !== null) return { value, date: measurement.recordedOn };
  }
  return null;
}

function metricChange(measurements: BodyMeasurement[], metric: MetricKey): number | null {
  const values = measurements.map((measurement) => readMetric(measurement, metric)).filter((value): value is number => value !== null);
  if (values.length < 2) return null;
  return Math.round((values[0] - values.at(-1)!) * 10) / 10;
}

function formatMetric(value: number | undefined, unit: string, locale: string) {
  return value === undefined ? '—' : `${value.toLocaleString(locale)}${unit ? ` ${unit}` : ''}`;
}

function formatChange(value: number | null, unit: string, locale: string) {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString(locale)} ${unit}`;
}

function emptyForm(height?: number): FormState {
  return {
    recordedOn: today(), weightKg: '', heightCm: height?.toString() ?? '', bodyFatPercent: '',
    neckCm: '', chestCm: '', waistCm: '', hipsCm: '', bicepsCm: '', thighCm: '', calfCm: '', notes: '',
  };
}

function toForm(measurement: BodyMeasurement): FormState {
  const value = (number: number | null) => number?.toString() ?? '';
  return {
    recordedOn: measurement.recordedOn,
    weightKg: value(measurement.weightKg), heightCm: value(measurement.heightCm), bodyFatPercent: value(measurement.bodyFatPercent),
    neckCm: value(measurement.neckCm), chestCm: value(measurement.chestCm), waistCm: value(measurement.waistCm),
    hipsCm: value(measurement.hipsCm), bicepsCm: value(measurement.bicepsCm), thighCm: value(measurement.thighCm),
    calfCm: value(measurement.calfCm), notes: measurement.notes ?? '',
  };
}

function toPayload(form: FormState) {
  const value = (input: string) => input.trim() === '' ? null : Number(input.replace(',', '.'));
  return {
    recordedOn: form.recordedOn,
    weightKg: value(form.weightKg), heightCm: value(form.heightCm), bodyFatPercent: value(form.bodyFatPercent),
    neckCm: value(form.neckCm), chestCm: value(form.chestCm), waistCm: value(form.waistCm),
    hipsCm: value(form.hipsCm), bicepsCm: value(form.bicepsCm), thighCm: value(form.thighCm),
    calfCm: value(form.calfCm), notes: form.notes.trim() || null,
  };
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
