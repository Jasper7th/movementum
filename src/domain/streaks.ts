import { progressionConfig } from '../config/progression';
import type { DayHistoryRecord, PersistedDailyState, ProgressState } from './models';
import { addLocalDays, startOfLocalWeek } from './calendar';
import { classifyDailyState } from './dayClassification';
import { activityCatalog, isActivityId } from '../data/activities';
import { getManualActivityTitle } from './manualActivities';

export function makeHistoryRecord(daily: PersistedDailyState): DayHistoryRecord {
  const suggestedActivities = daily.completedActivityIds.filter(isActivityId).map((id) => ({
    id,
    source: 'suggested' as const,
    title: activityCatalog[id].title,
    durationMinutes: activityCatalog[id].durationMinutes,
    xp: activityCatalog[id].xp,
    contribution: activityCatalog[id].weeklyContribution,
  }));
  const manualActivities = (daily.manualActivities ?? []).map((activity) => ({
    id: activity.id,
    source: 'manual' as const,
    title: getManualActivityTitle(activity),
    durationMinutes: activity.durationMinutes,
    xp: activity.xp,
    contribution: activity.contribution,
    categoryId: activity.categoryId,
    label: activity.label,
    createdAt: activity.createdAt,
  }));
  return {
    date: daily.date,
    earnedXp: daily.earnedXp,
    active: daily.earnedXp >= progressionConfig.activeDayXpThreshold,
    full: daily.earnedXp >= progressionConfig.dailyXpTarget,
    classification: classifyDailyState(daily),
    activities: [...suggestedActivities, ...manualActivities],
  };
}

export function upsertHistoryRecord(
  history: DayHistoryRecord[],
  record: DayHistoryRecord,
): DayHistoryRecord[] {
  return [...history.filter((item) => item.date !== record.date), record]
    .sort((first, second) => first.date.localeCompare(second.date));
}

function activeDateSet(history: DayHistoryRecord[], daily: PersistedDailyState): Set<string> {
  const records = upsertHistoryRecord(history, makeHistoryRecord(daily));
  return new Set(records.filter((record) => record.active).map((record) => record.date));
}

export function calculateCurrentStreak(
  history: DayHistoryRecord[],
  daily: PersistedDailyState,
  today: string,
): number {
  const activeDates = activeDateSet(history, daily);
  let cursor = activeDates.has(today) ? today : addLocalDays(today, -1);
  let streak = 0;
  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}

export function calculateLongestStreak(
  history: DayHistoryRecord[],
  daily: PersistedDailyState,
): number {
  const activeDates = [...activeDateSet(history, daily)].sort();
  let longest = 0;
  let current = 0;
  let previous: string | undefined;
  for (const date of activeDates) {
    current = previous && addLocalDays(previous, 1) === date ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  }
  return longest;
}

export function refreshProgress(
  progress: ProgressState,
  daily: PersistedDailyState,
  today: string,
): ProgressState {
  const history = upsertHistoryRecord(progress.history, makeHistoryRecord(daily));
  return {
    history,
    currentStreak: calculateCurrentStreak(history, daily, today),
    longestStreak: calculateLongestStreak(history, daily),
  };
}

export function getWeeklySummary(
  progress: ProgressState,
  daily: PersistedDailyState,
  today: string,
) {
  const weekStart = startOfLocalWeek(today);
  const records = upsertHistoryRecord(progress.history, makeHistoryRecord(daily))
    .filter((record) => record.date >= weekStart && record.date <= today);
  return {
    activeDays: records.filter((record) => record.active).length,
    fullDays: records.filter((record) => record.full).length,
    workoutDays: records.filter((record) => record.classification === 'workout').length,
    lightDays: records.filter((record) => record.classification === 'light').length,
    unclassifiedActiveDays: records.filter((record) => record.classification === 'active-unclassified').length,
  };
}
