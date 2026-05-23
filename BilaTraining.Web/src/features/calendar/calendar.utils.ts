import type { TranslationKey } from '../../i18n';
import type { SessionStatus } from '../../shared/models';

type StatusTranslationKey = Extract<TranslationKey, 'status.planned' | 'status.completed' | 'status.cancelled' | 'status.noShow' | 'status.unknown'>;

export function sessionStatusLabel(status: SessionStatus, t?: (key: StatusTranslationKey) => string): string {
  switch (status) {
    case 0:
      return t ? t('status.planned') : 'Planned';
    case 1:
      return t ? t('status.completed') : 'Completed';
    case 2:
      return t ? t('status.cancelled') : 'Cancelled';
    case 3:
      return t ? t('status.noShow') : 'No show';
    default:
      return t ? t('status.unknown') : 'Unknown';
  }
}

export function formatSessionWindow(startAtUtc: string, endAtUtc: string, locale = 'en-US'): string {
  const start = new Date(startAtUtc);
  const end = new Date(endAtUtc);
  const startDate = start.toLocaleDateString(locale);
  const startTime = start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  return `${startDate}, ${startTime} - ${endTime}`;
}

export function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDayKey(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

export function buildMonthGrid(month: Date): Date[] {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function combineDayAndTime(day: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const value = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0);
  return toDateTimeLocalValue(value.toISOString());
}

export function extractTime(value: string): string | null {
  if (!value.includes('T')) {
    return null;
  }

  return value.slice(11, 16);
}

export function formatTimeShort(value: string, locale = 'en-US'): string {
  return new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}
