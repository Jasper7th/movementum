import { achievementCatalog, type AchievementDefinition, type AchievementId } from '../data/achievements';
import { addLocalDays } from './calendar';
import { classifyDailyState } from './dayClassification';
import { getLevelFromLifetimeXp } from './levels';
import { getLifetimeStats } from './lifetime';
import type { AchievementUnlock, PersistedAppState } from './models';
import { getWeeklySummary } from './streaks';

export interface AchievementProgress {
  current: number;
  target: number;
  label: string;
  ratio: number;
}

export interface AchievementSummary {
  definition: AchievementDefinition;
  unlock?: AchievementUnlock;
  progress?: AchievementProgress;
}

function measurableProgress(current: number, target: number, suffix: string): AchievementProgress {
  const safeCurrent = Math.max(0, current);
  return { current: safeCurrent, target, label: `${safeCurrent.toLocaleString()} / ${target.toLocaleString()} ${suffix}`, ratio: Math.min(safeCurrent / target, 1) };
}

function hasBackAtItPattern(state: PersistedAppState): boolean {
  if (classifyDailyState(state.daily) === 'inactive') return false;
  const priorActiveDates = state.progress.history
    .filter((record) => record.active && record.date < state.daily.date)
    .map((record) => record.date)
    .sort();
  const latestPriorActive = priorActiveDates.at(-1);
  return Boolean(latestPriorActive && addLocalDays(latestPriorActive, 1) < state.daily.date);
}

function extendsStreakWithLightDay(state: PersistedAppState): boolean {
  if (classifyDailyState(state.daily) !== 'light') return false;
  const yesterday = addLocalDays(state.daily.date, -1);
  return state.progress.history.some((record) => record.date === yesterday && record.active);
}

export function getAchievementProgress(
  achievement: AchievementDefinition,
  state: PersistedAppState,
): AchievementProgress | undefined {
  const lifetime = getLifetimeStats(state.progress, state.daily);
  const level = getLevelFromLifetimeXp(lifetime.lifetimeXp);
  switch (achievement.requirement) {
    case 'active-days': return measurableProgress(lifetime.activeDays, achievement.target, achievement.target === 1 ? 'active day' : 'active days');
    case 'current-streak': return measurableProgress(Math.max(state.progress.currentStreak, state.progress.longestStreak), achievement.target, 'day streak');
    case 'workout-days': return measurableProgress(lifetime.workoutDays, achievement.target, 'workout days');
    case 'light-days': return measurableProgress(lifetime.lightDays, achievement.target, achievement.target === 1 ? 'light day' : 'light days');
    case 'level': {
      const base = measurableProgress(level, achievement.target, '');
      return { ...base, label: `Level ${base.current} / ${base.target}` };
    }
    case 'lifetime-xp': return measurableProgress(lifetime.lifetimeXp, achievement.target, 'XP');
    default: return undefined;
  }
}

function isRequirementMet(achievement: AchievementDefinition, state: PersistedAppState): boolean {
  const progress = getAchievementProgress(achievement, state);
  if (progress) return progress.current >= progress.target;
  const preferences = state.preferences;
  if (!preferences) return false;
  const week = getWeeklySummary(state.progress, state.daily, state.daily.date);
  switch (achievement.requirement) {
    case 'balanced-week':
      return preferences.workoutDaysPerWeek > 0
        && preferences.activeRecoveryDaysPerWeek > 0
        && week.workoutDays >= preferences.workoutDaysPerWeek
        && week.lightDays >= preferences.activeRecoveryDaysPerWeek;
    case 'full-week': {
      const workoutTarget = preferences.workoutDaysPerWeek;
      const lightTarget = preferences.activeRecoveryDaysPerWeek;
      return workoutTarget + lightTarget > 0
        && (workoutTarget === 0 || week.workoutDays >= workoutTarget)
        && (lightTarget === 0 || week.lightDays >= lightTarget);
    }
    case 'back-at-it': return hasBackAtItPattern(state);
    case 'still-moving': return extendsStreakWithLightDay(state);
    default: return false;
  }
}

export function evaluateAchievements(state: PersistedAppState, unlockedAt = new Date().toISOString()): AchievementUnlock[] {
  const alreadyUnlocked = new Set(state.achievements.map((unlock) => unlock.id));
  return achievementCatalog
    .filter((achievement) => !alreadyUnlocked.has(achievement.id) && isRequirementMet(achievement, state))
    .map((achievement) => ({ id: achievement.id, unlockedAt }));
}

export function applyAchievementEvaluation(
  state: PersistedAppState,
  unlockedAt = new Date().toISOString(),
): { state: PersistedAppState; newlyUnlocked: AchievementUnlock[] } {
  const newlyUnlocked = evaluateAchievements(state, unlockedAt);
  if (newlyUnlocked.length === 0) return { state, newlyUnlocked };
  return { state: { ...state, achievements: [...state.achievements, ...newlyUnlocked] }, newlyUnlocked };
}

export function getAchievementSummaries(state: PersistedAppState): AchievementSummary[] {
  const unlocks = new Map(state.achievements.map((unlock) => [unlock.id, unlock]));
  return achievementCatalog.map((definition) => ({ definition, unlock: unlocks.get(definition.id), progress: getAchievementProgress(definition, state) }));
}

export function getAchievementPreview(state: PersistedAppState, limit = 3): AchievementSummary[] {
  const summaries = getAchievementSummaries(state);
  const recentUnlocked = summaries
    .filter((summary) => summary.unlock)
    .sort((a, b) => b.unlock!.unlockedAt.localeCompare(a.unlock!.unlockedAt));
  const closestLocked = summaries
    .filter((summary) => !summary.unlock)
    .sort((a, b) => (b.progress?.ratio ?? -1) - (a.progress?.ratio ?? -1));
  return [...recentUnlocked, ...closestLocked].slice(0, limit);
}

export function getAchievementById(id: AchievementId): AchievementDefinition {
  return achievementCatalog.find((achievement) => achievement.id === id)!;
}
