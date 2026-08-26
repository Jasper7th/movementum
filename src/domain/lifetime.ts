import type { PersistedDailyState, ProgressState } from './models';
import { makeHistoryRecord, upsertHistoryRecord } from './streaks';

export interface LifetimeStats {
  lifetimeXp: number;
  activeDays: number;
  workoutDays: number;
  lightDays: number;
  perfectDays: number;
  unclassifiedActiveDays: number;
  longestStreak: number;
}

export function getLifetimeStats(
  progress: ProgressState,
  daily: PersistedDailyState,
): LifetimeStats {
  const records = upsertHistoryRecord(progress.history, makeHistoryRecord(daily));
  return {
    lifetimeXp: records.reduce((total, record) => total + Math.max(0, record.earnedXp), 0),
    activeDays: records.filter((record) => record.active).length,
    workoutDays: records.filter((record) => record.classification === 'workout').length,
    lightDays: records.filter((record) => record.classification === 'light').length,
    perfectDays: records.filter((record) => record.full).length,
    unclassifiedActiveDays: records.filter((record) => record.classification === 'active-unclassified').length,
    longestStreak: progress.longestStreak,
  };
}
