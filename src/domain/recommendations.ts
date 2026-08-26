import { recommendationConfig } from '../config/recommendations';
import { progressionConfig } from '../config/progression';
import { activityCatalog, isActivityId, type ActivityId } from '../data/activities';
import type { DayClassification, DayHistoryRecord, PersistedDailyState, PrimaryGoal, Readiness, UserPreferences } from './models';
import { addLocalDays, localDateFromKey } from './calendar';

export type RecommendationReasonCode =
  | 'near-active-threshold' | 'near-perfect-threshold' | 'already-won'
  | 'perfect-day-progress' | 'perfect-day-finish' | 'post-workout-easy' | 'already-trained'
  | 'readiness-recovery' | 'weekly-workout-needed' | 'weekly-light-needed'
  | 'balance-after-workout' | 'balance-after-light-days'
  | 'goal-strength' | 'goal-endurance' | 'goal-active' | 'general-fit';

export interface RecommendationWeeklyContext {
  workoutDays: number;
  lightDays: number;
}

export interface RecommendationContext {
  readiness?: Readiness;
  preferences: UserPreferences;
  weekly: RecommendationWeeklyContext;
  recentHistory: DayHistoryRecord[];
  daily: PersistedDailyState;
  todayClassification: DayClassification;
  today: string;
}

export interface ActivityRecommendation {
  activityId: ActivityId;
  score: number;
  reasonCode: RecommendationReasonCode;
}

export interface SameDayWorkoutLoad {
  workoutLoad: number;
  substantialWorkoutCompleted: boolean;
}

export function getSameDayWorkoutLoad(daily: PersistedDailyState): SameDayWorkoutLoad {
  const suggestedLoad = daily.completedActivityIds.reduce((total, id) => {
    if (!isActivityId(id)) return total;
    const activity = activityCatalog[id];
    if (activity.weeklyContribution !== 'workout') return total;
    return total + activity.durationMinutes * recommendationConfig.sameDayWorkout.intensityLoadMultiplier[activity.intensity];
  }, 0);
  const manualLoad = (daily.manualActivities ?? [])
    .filter((activity) => activity.contribution === 'workout')
    .reduce((total, activity) => total + activity.durationMinutes, 0);
  const workoutLoad = suggestedLoad + manualLoad;
  return { workoutLoad, substantialWorkoutCompleted: workoutLoad >= recommendationConfig.sameDayWorkout.saturationLoadThreshold };
}

function accessAllowed(activityId: ActivityId, preferences: UserPreferences): boolean {
  const options = activityCatalog[activityId].accessOptions;
  return options.length === 0 || options.some((option) => preferences.activityAccess.includes(option));
}

function hasGoalAffinity(activityId: ActivityId, goal: PrimaryGoal): boolean {
  return (activityCatalog[activityId].goalAffinities as readonly PrimaryGoal[]).includes(goal);
}

function elapsedWeekFraction(today: string): number {
  const weekday = localDateFromKey(today).getDay();
  const mondayIndex = (weekday + 6) % 7;
  return (mondayIndex + 1) / 7;
}

function recentRun(history: readonly DayHistoryRecord[], today: string, classification: 'workout' | 'light'): number {
  const records = new Map(history.filter((record) => record.date < today).map((record) => [record.date, record]));
  let cursor = addLocalDays(today, -1);
  let count = 0;
  while (records.get(cursor)?.classification === classification) {
    count += 1;
    cursor = addLocalDays(cursor, -1);
  }
  return count;
}

function canAdvanceWeeklyType(todayClassification: DayClassification, contribution: 'workout' | 'light'): boolean {
  if (contribution === 'workout') return todayClassification !== 'workout';
  return todayClassification !== 'workout' && todayClassification !== 'light';
}

function completionScore(activityId: ActivityId, context: RecommendationContext): number {
  const activity = activityCatalog[activityId];
  const activeRemaining = progressionConfig.activeDayXpThreshold - context.daily.earnedXp;
  const perfectRemaining = progressionConfig.dailyXpTarget - context.daily.earnedXp;
  const gap = perfectRemaining > 0 && perfectRemaining <= progressionConfig.nearGoalXpThreshold
    ? perfectRemaining
    : activeRemaining > 0 && activeRemaining <= recommendationConfig.nearActiveWindowXp ? activeRemaining : undefined;
  if (gap === undefined || activity.xp < gap) return 0;
  const overshoot = activity.xp - gap;
  return recommendationConfig.completionBoost - Math.min(overshoot, recommendationConfig.completionOvershootPenaltyCap);
}

function postWorkoutPerfectScore(activityId: ActivityId, context: RecommendationContext, saturated: boolean): number {
  const activity = activityCatalog[activityId];
  const remaining = progressionConfig.dailyXpTarget - context.daily.earnedXp;
  if (!saturated || remaining <= 0 || activity.weeklyContribution !== 'light') return 0;
  const difference = Math.abs(remaining - activity.xp);
  return Math.max(0, recommendationConfig.sameDayWorkout.perfectProgressBoost - difference * recommendationConfig.sameDayWorkout.perfectProgressDifferencePenalty);
}

function getReasonCode(activityId: ActivityId, context: RecommendationContext, workoutRun: number, lightRun: number, saturated: boolean): RecommendationReasonCode {
  const activity = activityCatalog[activityId];
  if (context.daily.earnedXp >= progressionConfig.dailyXpTarget) return 'already-won';
  const perfectRemaining = progressionConfig.dailyXpTarget - context.daily.earnedXp;
  if (perfectRemaining > 0 && perfectRemaining <= progressionConfig.nearGoalXpThreshold && activity.xp >= perfectRemaining) return saturated ? 'perfect-day-finish' : 'near-perfect-threshold';
  const activeRemaining = progressionConfig.activeDayXpThreshold - context.daily.earnedXp;
  if (activeRemaining > 0 && activeRemaining <= recommendationConfig.nearActiveWindowXp && activity.xp >= activeRemaining) return 'near-active-threshold';
  if (saturated && activity.weeklyContribution === 'light') return context.readiness === 'recovery' || context.readiness === 'low' ? 'post-workout-easy' : 'perfect-day-progress';
  if (saturated && activity.weeklyContribution === 'workout') return 'already-trained';
  if (context.readiness === 'recovery' && activity.recoveryFriendly) return 'readiness-recovery';
  if (workoutRun > 0 && activity.weeklyContribution === 'light' && context.readiness !== 'ready') return 'balance-after-workout';
  if (lightRun >= 2 && activity.weeklyContribution === 'workout' && context.todayClassification !== 'workout') return 'balance-after-light-days';
  if (activity.weeklyContribution === 'workout' && canAdvanceWeeklyType(context.todayClassification, 'workout') && context.weekly.workoutDays < context.preferences.workoutDaysPerWeek) return 'weekly-workout-needed';
  if (activity.weeklyContribution === 'light' && canAdvanceWeeklyType(context.todayClassification, 'light') && context.weekly.lightDays < context.preferences.activeRecoveryDaysPerWeek) return 'weekly-light-needed';
  if (context.preferences.primaryGoal === 'build-muscle' && hasGoalAffinity(activityId, 'build-muscle')) return 'goal-strength';
  if (context.preferences.primaryGoal === 'improve-endurance' && hasGoalAffinity(activityId, 'improve-endurance')) return 'goal-endurance';
  if (context.preferences.primaryGoal === 'get-more-active' && hasGoalAffinity(activityId, 'get-more-active')) return 'goal-active';
  return 'general-fit';
}

export function getRankedActivities(context: RecommendationContext): ActivityRecommendation[] {
  const completed = new Set(context.daily.completedActivityIds);
  const readinessMode = context.readiness ?? 'unselected';
  const workoutRemaining = Math.max(context.preferences.workoutDaysPerWeek - context.weekly.workoutDays, 0);
  const lightRemaining = Math.max(context.preferences.activeRecoveryDaysPerWeek - context.weekly.lightDays, 0);
  const elapsed = elapsedWeekFraction(context.today);
  const workoutPaceGap = Math.max(context.preferences.workoutDaysPerWeek * elapsed - context.weekly.workoutDays, 0);
  const lightPaceGap = Math.max(context.preferences.activeRecoveryDaysPerWeek * elapsed - context.weekly.lightDays, 0);
  const workoutRun = recentRun(context.recentHistory, context.today, 'workout');
  const lightRun = recentRun(context.recentHistory, context.today, 'light');
  const canAdvanceWorkout = canAdvanceWeeklyType(context.todayClassification, 'workout');
  const canAdvanceLight = canAdvanceWeeklyType(context.todayClassification, 'light');
  const workoutLoad = getSameDayWorkoutLoad(context.daily);
  const saturated = context.todayClassification === 'workout' && workoutLoad.substantialWorkoutCompleted;

  const ranked = (Object.keys(activityCatalog) as ActivityId[])
    .filter((id) => !completed.has(id) && accessAllowed(id, context.preferences))
    .map((activityId, stableIndex) => {
      const activity = activityCatalog[activityId];
      let score = recommendationConfig.readinessIntensity[readinessMode][activity.intensity];
      if (activity.recoveryFriendly && (readinessMode === 'low' || readinessMode === 'recovery')) score += recommendationConfig.recoveryFriendlyBoost;
      if (hasGoalAffinity(activityId, context.preferences.primaryGoal)) {
        const multiplier = saturated && context.preferences.primaryGoal === 'build-muscle'
          ? recommendationConfig.sameDayWorkout.buildMuscleGoalMultiplier : 1;
        score += recommendationConfig.goalAffinityBoost * multiplier;
      }
      if (activity.weeklyContribution === 'workout') {
        if (readinessMode === 'recovery') score -= recommendationConfig.recoveryWorkoutPenalty;
        if (canAdvanceWorkout) score += Math.min(workoutRemaining, 2) * recommendationConfig.weeklyRemainingPerDay + workoutPaceGap * recommendationConfig.weeklyPacePerDay;
        if (canAdvanceLight && workoutRemaining === 0 && lightRemaining > 0) score -= recommendationConfig.metCategoryWhileOtherBehindPenalty;
        if (context.todayClassification === 'workout') score -= recommendationConfig.sameTypeAlreadyTodayPenalty;
        if (lightRun >= 2 && workoutRemaining > 0 && (readinessMode === 'ready' || readinessMode === 'normal')) score += recommendationConfig.consecutiveTypeBalanceBoost;
        if (workoutRun >= 2 && readinessMode !== 'ready') score -= recommendationConfig.consecutiveSameTypePenalty;
        if (saturated) score -= recommendationConfig.sameDayWorkout.additionalWorkoutPenalty[readinessMode][activity.intensity];
      } else if (activity.weeklyContribution === 'light') {
        if (canAdvanceLight) score += Math.min(lightRemaining, 2) * recommendationConfig.weeklyRemainingPerDay + lightPaceGap * recommendationConfig.weeklyPacePerDay;
        if (canAdvanceWorkout && lightRemaining === 0 && workoutRemaining > 0) score -= recommendationConfig.metCategoryWhileOtherBehindPenalty;
        if (context.todayClassification === 'light') score -= recommendationConfig.sameTypeAlreadyTodayPenalty / 2;
        if (workoutRun > 0 && readinessMode !== 'ready') score += recommendationConfig.yesterdayWorkoutLightBoost;
        if (workoutRun >= 2 && readinessMode !== 'ready') score += recommendationConfig.consecutiveTypeBalanceBoost;
        if (saturated) score += recommendationConfig.sameDayWorkout.lightFollowUpBoost[readinessMode];
      }
      score += completionScore(activityId, context);
      score += postWorkoutPerfectScore(activityId, context, saturated);
      return { activityId, score, stableIndex, reasonCode: getReasonCode(activityId, context, workoutRun, lightRun, saturated) };
    })
    .sort((first, second) => second.score - first.score || first.stableIndex - second.stableIndex);

  return ranked.map(({ activityId, score, reasonCode }) => ({ activityId, score, reasonCode }));
}

export function getRecommendedActivities(context: RecommendationContext): ActivityRecommendation[] {
  const readinessMode = context.readiness ?? 'unselected';
  const limit = readinessMode === 'ready' ? recommendationConfig.resultCount.ready : recommendationConfig.resultCount.default;
  return getRankedActivities(context).slice(0, limit);
}

export function getRecommendationReasonCopy(code: RecommendationReasonCode): string {
  switch (code) {
    case 'near-active-threshold': return 'A small step can make today active.';
    case 'near-perfect-threshold': return 'This is enough to finish your Perfect Day.';
    case 'perfect-day-progress': return 'A little more movement can bring you closer to a Perfect Day.';
    case 'perfect-day-finish': return 'Just enough to finish your Perfect Day.';
    case 'post-workout-easy': return 'You’ve handled your workout today. Keep anything extra easy.';
    case 'already-trained': return 'You’ve already trained today. Anything extra is optional.';
    case 'already-won': return 'You’ve already won today. Anything extra is a bonus.';
    case 'readiness-recovery': return 'Recovery fits how you’re feeling today.';
    case 'weekly-workout-needed': return 'A workout would move your weekly plan forward.';
    case 'weekly-light-needed': return 'A lighter day would move your weekly plan forward.';
    case 'balance-after-workout': return 'You’ve trained recently. Lighter movement fits today.';
    case 'balance-after-light-days': return 'You’re ready to add a workout to this week.';
    case 'goal-strength': return 'This supports your strength goal.';
    case 'goal-endurance': return 'This supports your endurance goal.';
    case 'goal-active': return 'This is an approachable way to keep moving.';
    case 'general-fit': return 'This is a strong fit for today.';
  }
}
