import { progressionConfig } from '../config/progression';
import { activityCatalog, isActivityId } from '../data/activities';
import type { DayClassification, ManualActivityInstance, PersistedDailyState } from './models';

export function classifyDay(
  earnedXp: number,
  completedActivityIds: readonly string[],
  activeThreshold = progressionConfig.activeDayXpThreshold,
  manualActivities: readonly ManualActivityInstance[] = [],
): DayClassification {
  if (earnedXp < activeThreshold) return 'inactive';

  const contributions = completedActivityIds
    .filter(isActivityId)
    .map((id) => activityCatalog[id].weeklyContribution);
  contributions.push(...manualActivities.map((activity) => activity.contribution));
  if (contributions.includes('workout')) return 'workout';
  if (contributions.includes('light')) return 'light';
  return 'active-unclassified';
}

export function classifyDailyState(daily: PersistedDailyState): DayClassification {
  return classifyDay(
    daily.earnedXp,
    daily.completedActivityIds,
    progressionConfig.activeDayXpThreshold,
    daily.manualActivities ?? [],
  );
}

export const dayClassificationLabels: Record<DayClassification, string> = {
  workout: 'Workout day',
  light: 'Light / recovery day',
  'active-unclassified': 'Active day',
  inactive: 'Not active yet',
};
