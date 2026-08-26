import { notificationConfig } from '../config/notifications';
import { CURRENT_SCHEMA_VERSION } from '../config/storage';
import type { DayHistoryRecord, NotificationPreferences, PersistedAppState, PersistedDailyState, UserPreferences } from '../domain/models';

type LegacyDailyState = Omit<PersistedDailyState, 'manualActivities'>;
type LegacyHistoryRecord = Omit<DayHistoryRecord, 'activities'>;

interface LegacyProgress {
  currentStreak: number;
  longestStreak: number;
  history: LegacyHistoryRecord[];
}

interface LegacyV4State {
  schemaVersion: 4;
  preferences: UserPreferences | null;
  daily: LegacyDailyState;
  progress: LegacyProgress;
  achievements: PersistedAppState['achievements'];
  notificationPreferences: NotificationPreferences;
}

interface LegacyV6State extends Omit<PersistedAppState, 'schemaVersion' | 'hasCompletedIntroTutorial'> { schemaVersion: 6 }
interface LegacyV5State extends Omit<PersistedAppState, 'schemaVersion' | 'ownerUserId' | 'trackingStartedAt' | 'hasCompletedIntroTutorial'> { schemaVersion: 5 }

interface LegacyV3State extends Omit<LegacyV4State, 'schemaVersion' | 'notificationPreferences'> { schemaVersion: 3 }
interface LegacyV2State extends Omit<LegacyV3State, 'schemaVersion' | 'achievements'> { schemaVersion: 2 }
interface LegacyV1State extends Omit<LegacyV2State, 'schemaVersion' | 'progress'> {
  schemaVersion: 1;
  progress: Omit<LegacyProgress, 'history'> & { history: Array<Omit<LegacyHistoryRecord, 'classification'>> };
}

const defaultNotificationPreferences: NotificationPreferences = {
  enabled: false,
  dailyReminderEnabled: true,
  reminderHour: notificationConfig.defaultReminderHour,
  streakReminderEnabled: true,
  weeklyReminderEnabled: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasStateShape(value: Record<string, unknown>): boolean {
  return isRecord(value.daily) && isRecord(value.progress) && Array.isArray(value.progress.history);
}

function migrateDaily(daily: LegacyDailyState): PersistedDailyState {
  return { ...daily, manualActivities: [] };
}

function migrateHistory(history: LegacyHistoryRecord[]): DayHistoryRecord[] {
  return history.map((record) => ({ ...record, activities: [] }));
}

function getTrackingStartedAt(state: { preferences: UserPreferences | null; daily: { date: string }; progress: { history: Array<{ date: string }> } }): string | undefined {
  if (!state.preferences?.onboardingCompleted) return undefined;
  return [state.daily.date, ...state.progress.history.map((record) => record.date)].sort()[0] ?? state.daily.date;
}

function finalize<T extends Omit<PersistedAppState, 'schemaVersion' | 'ownerUserId' | 'trackingStartedAt' | 'hasCompletedIntroTutorial'>>(state: T): PersistedAppState {
  return {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    trackingStartedAt: getTrackingStartedAt(state),
    hasCompletedIntroTutorial: Boolean(state.preferences?.onboardingCompleted),
  };
}

export function migratePersistedState(value: unknown): PersistedAppState | null {
  if (!isRecord(value) || !('schemaVersion' in value)) return null;
  if (value.schemaVersion === CURRENT_SCHEMA_VERSION) return value as unknown as PersistedAppState;
  if (!hasStateShape(value)) return null;

  if (value.schemaVersion === 6) {
    const legacy = value as unknown as LegacyV6State;
    return {
      ...legacy,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      hasCompletedIntroTutorial: Boolean(legacy.preferences?.onboardingCompleted),
    };
  }

  if (value.schemaVersion === 5) return finalize(value as unknown as LegacyV5State);

  if (value.schemaVersion === 4) {
    const legacy = value as unknown as LegacyV4State;
    return finalize({ ...legacy, daily: migrateDaily(legacy.daily), progress: { ...legacy.progress, history: migrateHistory(legacy.progress.history) } });
  }
  if (value.schemaVersion === 3) {
    const legacy = value as unknown as LegacyV3State;
    return finalize({ ...legacy, daily: migrateDaily(legacy.daily), progress: { ...legacy.progress, history: migrateHistory(legacy.progress.history) }, notificationPreferences: { ...defaultNotificationPreferences } });
  }
  if (value.schemaVersion === 2) {
    const legacy = value as unknown as LegacyV2State;
    return finalize({ ...legacy, daily: migrateDaily(legacy.daily), progress: { ...legacy.progress, history: migrateHistory(legacy.progress.history) }, achievements: [], notificationPreferences: { ...defaultNotificationPreferences } });
  }
  if (value.schemaVersion !== 1) return null;
  const legacy = value as unknown as LegacyV1State;
  return finalize({
    ...legacy,
    daily: migrateDaily(legacy.daily),
    progress: {
      ...legacy.progress,
      history: legacy.progress.history.map((record) => ({ ...record, classification: record.active ? 'active-unclassified' : 'inactive', activities: [] })),
    },
    achievements: [],
    notificationPreferences: { ...defaultNotificationPreferences },
  });
}
