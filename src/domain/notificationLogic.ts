import { notificationConfig } from '../config/notifications';
import { progressionConfig } from '../config/progression';
import type { PersistedAppState } from './models';
import { getWeeklySummary } from './streaks';

export type MomentumNotificationType = 'daily' | 'streak' | 'weekly' | 'test';
export type NotificationPermissionStatus = 'undetermined' | 'granted' | 'denied' | 'unavailable';

export interface MomentumNotificationContent {
  title: string;
  body: string;
}

export interface NotificationPlanItem {
  type: Exclude<MomentumNotificationType, 'test'>;
  content: MomentumNotificationContent;
  triggerDate: Date;
}

export interface ExistingMomentumSchedule {
  id: string;
  type: MomentumNotificationType;
}

export function getNotificationReconciliation(
  existing: readonly ExistingMomentumSchedule[],
  desired: readonly NotificationPlanItem[],
) {
  return { cancelIds: existing.map((item) => item.id), schedule: [...desired] };
}

export interface WeeklyReminderState {
  workoutRemaining: number;
  lightRemaining: number;
}

export function canScheduleNotifications(enabled: boolean, permission: NotificationPermissionStatus): boolean {
  return enabled && permission === 'granted';
}

export function getDailyReminderContent(state: PersistedAppState): MomentumNotificationContent | null {
  const xp = state.daily.earnedXp;
  const activeRemaining = Math.max(progressionConfig.activeDayXpThreshold - xp, 0);
  const perfectRemaining = Math.max(progressionConfig.dailyXpTarget - xp, 0);
  if (perfectRemaining === 0) return null;
  if (xp >= progressionConfig.activeDayXpThreshold) {
    if (perfectRemaining > progressionConfig.nearGoalXpThreshold) return null;
    return { title: `${perfectRemaining} XP from a perfect day`, body: 'One small activity can finish it.' };
  }
  if (state.progress.currentStreak > 0) {
    return { title: 'Make today count', body: `${activeRemaining} XP keeps your active streak moving. A small activity still counts.` };
  }
  return { title: 'A little movement counts', body: `${activeRemaining} XP makes today active. A short walk or mobility session still counts.` };
}

export function getStreakReminderContent(state: PersistedAppState): MomentumNotificationContent | null {
  if (state.daily.earnedXp >= progressionConfig.activeDayXpThreshold || state.progress.currentStreak <= 0) return null;
  const remaining = progressionConfig.activeDayXpThreshold - state.daily.earnedXp;
  return { title: `Keep your ${state.progress.currentStreak}-day streak alive`, body: `${remaining} XP keeps it going. You still have time to move today.` };
}

export function getWeeklyReminderState(state: PersistedAppState): WeeklyReminderState | null {
  const preferences = state.preferences;
  if (!preferences || preferences.workoutDaysPerWeek + preferences.activeRecoveryDaysPerWeek === 0) return null;
  const week = getWeeklySummary(state.progress, state.daily, state.daily.date);
  const remaining = {
    workoutRemaining: Math.max(preferences.workoutDaysPerWeek - week.workoutDays, 0),
    lightRemaining: Math.max(preferences.activeRecoveryDaysPerWeek - week.lightDays, 0),
  };
  return remaining.workoutRemaining + remaining.lightRemaining === 0 ? null : remaining;
}

export function getWeeklyReminderContent(state: PersistedAppState): MomentumNotificationContent | null {
  const remaining = getWeeklyReminderState(state);
  if (!remaining) return null;
  if (remaining.workoutRemaining > 0 && remaining.lightRemaining > 0) {
    return { title: 'Finish your week', body: `${remaining.workoutRemaining} workout${remaining.workoutRemaining === 1 ? '' : 's'} and ${remaining.lightRemaining} lighter day${remaining.lightRemaining === 1 ? '' : 's'} left on your plan.` };
  }
  if (remaining.workoutRemaining > 0) {
    return { title: remaining.workoutRemaining === 1 ? 'One workout left' : `${remaining.workoutRemaining} workouts left`, body: `You’re ${remaining.workoutRemaining === 1 ? 'one workout' : `${remaining.workoutRemaining} workouts`} away from your weekly plan.` };
  }
  return { title: remaining.lightRemaining === 1 ? 'One lighter day left' : `${remaining.lightRemaining} lighter days left`, body: 'Walking or mobility can still move your weekly plan forward.' };
}

function todayAt(now: Date, hour: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
}

function currentWeekSundayAt(now: Date): Date {
  const daysUntilSunday = (7 - now.getDay()) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, notificationConfig.weeklyReminderHour, 0, 0, 0);
}

export function getNotificationPlan(state: PersistedAppState, now = new Date()): NotificationPlanItem[] {
  const preferences = state.notificationPreferences;
  if (!preferences.enabled) return [];
  const plan: NotificationPlanItem[] = [];
  const streakContent = preferences.streakReminderEnabled ? getStreakReminderContent(state) : null;
  const streakDate = todayAt(now, notificationConfig.streakReminderHour);
  const dailyContent = preferences.dailyReminderEnabled ? getDailyReminderContent(state) : null;
  const dailyDate = todayAt(now, preferences.reminderHour);
  const dailyWouldDuplicateStreak = Boolean(streakContent && preferences.reminderHour >= notificationConfig.streakReminderHour);
  if (dailyContent && dailyDate > now && !dailyWouldDuplicateStreak) plan.push({ type: 'daily', content: dailyContent, triggerDate: dailyDate });
  if (streakContent && streakDate > now) plan.push({ type: 'streak', content: streakContent, triggerDate: streakDate });
  const weeklyContent = preferences.weeklyReminderEnabled ? getWeeklyReminderContent(state) : null;
  const weeklyDate = currentWeekSundayAt(now);
  if (weeklyContent && weeklyDate > now) plan.push({ type: 'weekly', content: weeklyContent, triggerDate: weeklyDate });
  return plan;
}
