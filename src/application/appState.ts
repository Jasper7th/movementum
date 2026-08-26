import { progressionConfig } from '../config/progression';
import { CURRENT_SCHEMA_VERSION } from '../config/storage';
import { notificationConfig } from '../config/notifications';
import { activityCatalog, isActivityId, type ActivityId } from '../data/activities';
import type { PersistedAppState, UserPreferences } from '../domain/models';
import { refreshProgress } from '../domain/streaks';

export function createInitialAppState(today: string, ownerUserId?: string): PersistedAppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ownerUserId,
    hasCompletedIntroTutorial: false,
    preferences: null,
    daily: { date: today, completedActivityIds: [], manualActivities: [], earnedXp: 0 },
    progress: { currentStreak: 0, longestStreak: 0, history: [] },
    achievements: [],
    notificationPreferences: {
      enabled: false,
      dailyReminderEnabled: true,
      reminderHour: notificationConfig.defaultReminderHour,
      streakReminderEnabled: true,
      weeklyReminderEnabled: true,
    },
  };
}

export function updateNotificationPreferences(
  state: PersistedAppState,
  patch: Partial<PersistedAppState['notificationPreferences']>,
): PersistedAppState {
  return { ...state, notificationPreferences: { ...state.notificationPreferences, ...patch } };
}

export function rolloverToDate(state: PersistedAppState, today: string): PersistedAppState {
  if (state.daily.date === today) {
    return { ...state, progress: refreshProgress(state.progress, state.daily, today) };
  }

  const progressWithPreviousDay = state.daily.date < today
    ? refreshProgress(state.progress, state.daily, today)
    : state.progress;
  const daily = { date: today, completedActivityIds: [], manualActivities: [], earnedXp: 0 };
  return { ...state, daily, progress: refreshProgress(progressWithPreviousDay, daily, today) };
}

export function finishOnboarding(
  state: PersistedAppState,
  preferences: Omit<UserPreferences, 'onboardingCompleted'>,
  today = state.daily.date,
): PersistedAppState {
  return { ...state, trackingStartedAt: state.trackingStartedAt ?? today, preferences: { ...preferences, onboardingCompleted: true } };
}

export function replacePreferences(
  state: PersistedAppState,
  preferences: Omit<UserPreferences, 'onboardingCompleted'>,
): PersistedAppState {
  return { ...state, preferences: { ...preferences, onboardingCompleted: true } };
}

export function completeIntroTutorial(state: PersistedAppState): PersistedAppState {
  return state.hasCompletedIntroTutorial ? state : { ...state, hasCompletedIntroTutorial: true };
}

export function setDailyReadiness(
  state: PersistedAppState,
  readiness: PersistedAppState['daily']['readiness'],
  today: string,
): PersistedAppState {
  const current = rolloverToDate(state, today);
  return { ...current, daily: { ...current.daily, readiness } };
}

export function awardActivity(
  state: PersistedAppState,
  activityId: ActivityId,
  today: string,
): PersistedAppState {
  const current = rolloverToDate(state, today);
  if (current.daily.completedActivityIds.includes(activityId)) return current;
  const completedActivityIds = [...current.daily.completedActivityIds, activityId];
  const daily = {
    ...current.daily,
    completedActivityIds,
    earnedXp: calculateEarnedXp(completedActivityIds, current.daily.manualActivities),
  };
  return { ...current, daily, progress: refreshProgress(current.progress, daily, today) };
}

export function calculateEarnedXp(
  completedActivityIds: readonly string[],
  manualActivities: Readonly<PersistedAppState['daily']['manualActivities']> = [],
): number {
  const suggestedXp = completedActivityIds
    .filter(isActivityId)
    .reduce((total, id) => total + activityCatalog[id].xp, 0);
  return Math.max(0, suggestedXp + manualActivities.reduce((total, activity) => total + Math.max(0, activity.xp), 0));
}

export function unawardActivity(
  state: PersistedAppState,
  activityId: ActivityId,
  today: string,
): PersistedAppState {
  const current = rolloverToDate(state, today);
  if (!current.daily.completedActivityIds.includes(activityId)) return current;
  const completedActivityIds = current.daily.completedActivityIds.filter((id) => id !== activityId);
  const daily = {
    ...current.daily,
    completedActivityIds,
    earnedXp: calculateEarnedXp(completedActivityIds, current.daily.manualActivities),
  };
  return { ...current, daily, progress: refreshProgress(current.progress, daily, today) };
}

export function logManualActivity(
  state: PersistedAppState,
  activity: PersistedAppState['daily']['manualActivities'][number],
  today: string,
): PersistedAppState {
  const current = rolloverToDate(state, today);
  if (current.daily.manualActivities.some((item) => item.id === activity.id)) return current;
  const manualActivities = [...current.daily.manualActivities, { ...activity, date: today }];
  const daily = {
    ...current.daily,
    manualActivities,
    earnedXp: calculateEarnedXp(current.daily.completedActivityIds, manualActivities),
  };
  return { ...current, daily, progress: refreshProgress(current.progress, daily, today) };
}

export function removeManualActivity(
  state: PersistedAppState,
  activityId: string,
  today: string,
): PersistedAppState {
  const current = rolloverToDate(state, today);
  if (!current.daily.manualActivities.some((activity) => activity.id === activityId)) return current;
  const manualActivities = current.daily.manualActivities.filter((activity) => activity.id !== activityId);
  const daily = {
    ...current.daily,
    manualActivities,
    earnedXp: calculateEarnedXp(current.daily.completedActivityIds, manualActivities),
  };
  return { ...current, daily, progress: refreshProgress(current.progress, daily, today) };
}

export function isActiveToday(state: PersistedAppState): boolean {
  return state.daily.earnedXp >= progressionConfig.activeDayXpThreshold;
}
