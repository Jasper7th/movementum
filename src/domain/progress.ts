import type { ActivityDefinition, DailyActivity, DailyProgress } from './models';

export function calculateDailyProgress(
  activities: DailyActivity[], targetXp: number, activeDayThreshold: number,
): DailyProgress {
  const earnedXp = activities.reduce(
    (total, activity) => total + (activity.completed ? activity.xp : 0), 0,
  );
  return { earnedXp, targetXp, activeDayThreshold };
}

export function getDailyStatus(progress: DailyProgress) {
  return {
    isActiveDay: progress.earnedXp >= progress.activeDayThreshold,
    isFullDay: progress.earnedXp >= progress.targetXp,
    ratio: Math.min(progress.earnedXp / progress.targetXp, 1),
  };
}

export function getDailyProgressMessage(
  progress: DailyProgress,
  nearGoalXpThreshold: number,
  availableActivities: ActivityDefinition[] = [],
): string {
  const remainingXp = Math.max(progress.targetXp - progress.earnedXp, 0);

  if (remainingXp === 0) return 'Perfect day complete.';

  if (remainingXp <= nearGoalXpThreshold) {
    const closer = availableActivities
      .filter((activity) => activity.xp >= remainingXp)
      .sort((first, second) => first.xp - second.xp)[0];
    const suggestion = closer ? ` ${closer.title} can finish it.` : '';
    return `Only ${remainingXp} XP from a perfect day.${suggestion}`;
  }

  if (progress.earnedXp >= progress.activeDayThreshold) {
    return 'Your streak is safe. Keep going for a full day.';
  }

  return `${progress.activeDayThreshold} XP keeps your active streak moving. You can still win today.`;
}
