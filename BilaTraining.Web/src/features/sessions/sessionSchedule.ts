import { buildMonthDays, buildWeekDays, startOfDay, toDayKey } from '../calendar/calendar.utils';

export type SessionScheduleMode = 'single' | 'week' | 'month';

export function getScheduleAnchorDay(value: string, fallback: Date): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : startOfDay(parsed);
}

export function getSelectableScheduleDays(mode: SessionScheduleMode, anchorDay: Date): Date[] {
  switch (mode) {
    case 'week':
      return buildWeekDays(anchorDay);
    case 'month':
      return buildMonthDays(anchorDay);
    default:
      return [anchorDay];
  }
}

export function syncSelectedDayKeys(mode: SessionScheduleMode, anchorDay: Date, current: string[]): string[] {
  const anchorKey = toDayKey(anchorDay);

  if (mode === 'single') {
    return [anchorKey];
  }

  const availableKeys = new Set(getSelectableScheduleDays(mode, anchorDay).map((day) => toDayKey(day)));
  const next = current.filter((key) => availableKeys.has(key));

  if (next.length > 0) {
    return next;
  }

  return availableKeys.has(anchorKey) ? [anchorKey] : [];
}
