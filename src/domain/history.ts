import type { DayClassification, DayHistoryRecord, PersistedDailyState, ProgressState } from './models';
import { getMonthDateKeys, monthKeyFromDateKey } from './calendar';
import { makeHistoryRecord, upsertHistoryRecord } from './streaks';

export type CalendarDayStatus = DayClassification | 'today-unfinished' | 'future' | 'pre-tracking';

export interface CalendarDaySummary {
  date: string;
  status: CalendarDayStatus;
  isToday: boolean;
  isSelectable: boolean;
  isPerfect: boolean;
  earnedXp: number;
  record?: DayHistoryRecord;
}

export interface MonthlyHistorySummary {
  activeDays: number;
  workoutDays: number;
  lightDays: number;
  unclassifiedActiveDays: number;
  perfectDays: number;
  totalXp: number;
}

export function getTrackingStartDate(progress: ProgressState, daily: PersistedDailyState): string {
  return [daily.date, ...progress.history.map((record) => record.date)].sort()[0];
}

export function getHistoryRecords(progress: ProgressState, daily: PersistedDailyState): DayHistoryRecord[] {
  return upsertHistoryRecord(progress.history, makeHistoryRecord(daily));
}

export function getCalendarDaySummary(
  date: string,
  record: DayHistoryRecord | undefined,
  today: string,
  trackingStart: string,
): CalendarDaySummary {
  if (date > today) return { date, status: 'future', isToday: false, isSelectable: false, isPerfect: false, earnedXp: 0 };
  if (date < trackingStart) return { date, status: 'pre-tracking', isToday: false, isSelectable: false, isPerfect: false, earnedXp: 0 };
  if (date === today && !record?.active) {
    return { date, status: 'today-unfinished', isToday: true, isSelectable: true, isPerfect: false, earnedXp: record?.earnedXp ?? 0, record };
  }
  return {
    date,
    status: record?.classification ?? 'inactive',
    isToday: date === today,
    isSelectable: true,
    isPerfect: record?.full ?? false,
    earnedXp: record?.earnedXp ?? 0,
    record,
  };
}

export function getMonthHistory(
  monthKey: string,
  progress: ProgressState,
  daily: PersistedDailyState,
  today: string,
): CalendarDaySummary[] {
  const records = new Map(getHistoryRecords(progress, daily).map((record) => [record.date, record]));
  const trackingStart = getTrackingStartDate(progress, daily);
  return getMonthDateKeys(monthKey).map((date) => getCalendarDaySummary(date, records.get(date), today, trackingStart));
}

export function aggregateMonth(days: readonly CalendarDaySummary[]): MonthlyHistorySummary {
  const trackedDays = days.filter((day) => day.status !== 'future' && day.status !== 'pre-tracking');
  return {
    activeDays: trackedDays.filter((day) => day.record?.active).length,
    workoutDays: trackedDays.filter((day) => day.status === 'workout').length,
    lightDays: trackedDays.filter((day) => day.status === 'light').length,
    unclassifiedActiveDays: trackedDays.filter((day) => day.status === 'active-unclassified').length,
    perfectDays: trackedDays.filter((day) => day.isPerfect).length,
    totalXp: trackedDays.reduce((total, day) => total + day.earnedXp, 0),
  };
}

export function getDefaultSelectedDate(
  monthKey: string,
  days: readonly CalendarDaySummary[],
  today: string,
): string | undefined {
  if (monthKeyFromDateKey(today) === monthKey) return today;
  return days.filter((day) => day.isSelectable && Boolean(day.record?.earnedXp || day.record?.active)).at(-1)?.date;
}
