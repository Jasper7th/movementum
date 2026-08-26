export type Readiness = 'ready' | 'normal' | 'low' | 'recovery';
export type ActivityCategory = 'strength' | 'endurance' | 'mobility' | 'recovery';
export type WeeklyContribution = 'workout' | 'light' | 'neutral';
export type DayClassification = 'workout' | 'light' | 'active-unclassified' | 'inactive';
export type PrimaryGoal = 'get-more-active' | 'build-muscle' | 'improve-endurance' | 'feel-healthier';
export type ActivityAccess = 'gym' | 'home-equipment' | 'bodyweight' | 'outdoors';
export type StartingActivityLevel = 'not-very-active' | 'somewhat-active' | 'active' | 'very-active';
export type AchievementCategory = 'consistency' | 'training' | 'balance' | 'progress' | 'resilience';
export type ActivityIntensity = 'low' | 'moderate' | 'high';

export interface UserPreferences {
  primaryGoal: PrimaryGoal;
  workoutDaysPerWeek: number;
  activeRecoveryDaysPerWeek: number;
  activityAccess: ActivityAccess[];
  startingActivityLevel: StartingActivityLevel;
  onboardingCompleted: boolean;
}

export interface DailyActivity {
  id: string;
  title: string;
  detail: string;
  xp: number;
  category: ActivityCategory;
  durationMinutes: number;
  completed: boolean;
  weeklyContribution: WeeklyContribution;
}

export type ActivityDefinition = Omit<DailyActivity, 'completed'> & {
  intensity: ActivityIntensity;
  goalAffinities: PrimaryGoal[];
  accessOptions: ActivityAccess[];
  recoveryFriendly: boolean;
};

export interface DailyProgress {
  earnedXp: number;
  targetXp: number;
  activeDayThreshold: number;
}

export interface PersistedDailyState {
  date: string;
  readiness?: Readiness;
  completedActivityIds: string[];
  manualActivities: ManualActivityInstance[];
  earnedXp: number;
}

export interface ManualActivityInstance {
  id: string;
  date: string;
  categoryId: import('../data/manualActivities').ManualActivityCategoryId;
  contribution: import('../data/manualActivities').ManualActivityContribution;
  durationMinutes: number;
  xp: number;
  label?: string;
  createdAt: string;
}

export interface ActivityHistoryItem {
  id: string;
  source: 'suggested' | 'manual';
  title: string;
  durationMinutes: number;
  xp: number;
  contribution: WeeklyContribution;
  categoryId?: import('../data/manualActivities').ManualActivityCategoryId;
  label?: string;
  createdAt?: string;
}

export interface DayHistoryRecord {
  date: string;
  earnedXp: number;
  active: boolean;
  full: boolean;
  classification: DayClassification;
  activities: ActivityHistoryItem[];
}

export interface ProgressState {
  currentStreak: number;
  longestStreak: number;
  history: DayHistoryRecord[];
}

export interface AchievementUnlock {
  id: import('../data/achievements').AchievementId;
  unlockedAt: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  dailyReminderEnabled: boolean;
  reminderHour: number;
  streakReminderEnabled: boolean;
  weeklyReminderEnabled: boolean;
}

export interface PersistedAppState {
  schemaVersion: 7;
  /** Supabase user that owns this device-local dataset. Legacy data is claimed once. */
  ownerUserId?: string;
  /** Local YYYY-MM-DD date from which missed-day history is meaningful. */
  trackingStartedAt?: string;
  /** Product education is intentionally separate from onboarding preferences. */
  hasCompletedIntroTutorial: boolean;
  preferences: UserPreferences | null;
  daily: PersistedDailyState;
  progress: ProgressState;
  achievements: AchievementUnlock[];
  notificationPreferences: NotificationPreferences;
}
