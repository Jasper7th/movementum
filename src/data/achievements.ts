import type { AchievementCategory } from '../domain/models';

export type AchievementRequirement =
  | 'active-days'
  | 'current-streak'
  | 'workout-days'
  | 'light-days'
  | 'balanced-week'
  | 'full-week'
  | 'level'
  | 'lifetime-xp'
  | 'back-at-it'
  | 'still-moving';

export const achievementCatalog = [
  { id: 'first-step', name: 'First Step', description: 'Complete your first Active Day.', category: 'consistency', requirement: 'active-days', target: 1 },
  { id: 'building-momentum', name: 'Building Momentum', description: 'Reach a 7-day active streak.', category: 'consistency', requirement: 'current-streak', target: 7 },
  { id: 'locked-in', name: 'Locked In', description: 'Reach a 30-day active streak.', category: 'consistency', requirement: 'current-streak', target: 30 },
  { id: 'keep-showing-up', name: 'Keep Showing Up', description: 'Complete 100 Active Days.', category: 'consistency', requirement: 'active-days', target: 100 },
  { id: 'getting-stronger', name: 'Getting Stronger', description: 'Complete 10 Workout Days.', category: 'training', requirement: 'workout-days', target: 10 },
  { id: 'routine-built', name: 'Routine Built', description: 'Complete 50 Workout Days.', category: 'training', requirement: 'workout-days', target: 50 },
  { id: 'century-club', name: 'Century Club', description: 'Complete 100 Workout Days.', category: 'training', requirement: 'workout-days', target: 100 },
  { id: 'recovery-counts', name: 'Recovery Counts', description: 'Complete your first Light / Recovery Day.', category: 'balance', requirement: 'light-days', target: 1 },
  { id: 'balanced-week', name: 'Balanced Week', description: 'Meet both workout and light / recovery targets in one week.', category: 'balance', requirement: 'balanced-week' },
  { id: 'full-week', name: 'Full Week', description: 'Complete every planned workout and lighter day in one week.', category: 'balance', requirement: 'full-week' },
  { id: 'moving-up', name: 'Moving Up', description: 'Reach Level 5.', category: 'progress', requirement: 'level', target: 5 },
  { id: 'double-digits', name: 'Double Digits', description: 'Reach Level 10.', category: 'progress', requirement: 'level', target: 10 },
  { id: 'veteran', name: 'Veteran', description: 'Reach Level 25.', category: 'progress', requirement: 'level', target: 25 },
  { id: 'five-figures', name: 'Five Figures', description: 'Reach 10,000 Lifetime XP.', category: 'progress', requirement: 'lifetime-xp', target: 10000 },
  { id: 'back-at-it', name: 'Back At It', description: 'Complete an Active Day after at least one fully missed day.', category: 'resilience', requirement: 'back-at-it' },
  { id: 'still-moving', name: 'Still Moving', description: 'Extend an active streak with a Light / Recovery Day.', category: 'resilience', requirement: 'still-moving' },
] as const satisfies readonly {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  requirement: AchievementRequirement;
  target?: number;
}[];

export type AchievementDefinition = (typeof achievementCatalog)[number];
export type AchievementId = AchievementDefinition['id'];

export const achievementCategoryLabels: Record<AchievementCategory, string> = {
  consistency: 'Consistency',
  training: 'Training',
  balance: 'Recovery / Balance',
  progress: 'Progress',
  resilience: 'Resilience',
};

export function isAchievementId(value: string): value is AchievementId {
  return achievementCatalog.some((achievement) => achievement.id === value);
}
