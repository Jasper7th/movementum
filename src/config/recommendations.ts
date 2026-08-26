import type { ActivityIntensity, PrimaryGoal, Readiness } from '../domain/models';

type ReadinessMode = Readiness | 'unselected';

/** Provisional, deliberately compact V1 ranking weights. */
export const recommendationConfig = {
  resultCount: { default: 3, ready: 4 },
  readinessIntensity: {
    ready: { low: 3, moderate: 14, high: 16 },
    normal: { low: 8, moderate: 13, high: 3 },
    low: { low: 16, moderate: 2, high: -14 },
    recovery: { low: 20, moderate: -10, high: -26 },
    unselected: { low: 9, moderate: 11, high: 1 },
  } satisfies Record<ReadinessMode, Record<ActivityIntensity, number>>,
  recoveryFriendlyBoost: 9,
  recoveryWorkoutPenalty: 20,
  goalAffinityBoost: 11,
  weeklyRemainingPerDay: 5,
  weeklyPacePerDay: 7,
  metCategoryWhileOtherBehindPenalty: 8,
  sameTypeAlreadyTodayPenalty: 13,
  yesterdayWorkoutLightBoost: 7,
  consecutiveTypeBalanceBoost: 11,
  consecutiveSameTypePenalty: 6,
  completionBoost: 52,
  completionOvershootPenaltyCap: 42,
  nearActiveWindowXp: 20,
  sameDayWorkout: {
    saturationLoadThreshold: 25,
    intensityLoadMultiplier: { low: 0.7, moderate: 1, high: 1.25 } satisfies Record<ActivityIntensity, number>,
    lightFollowUpBoost: { ready: 18, normal: 20, low: 20, recovery: 20, unselected: 18 } satisfies Record<ReadinessMode, number>,
    additionalWorkoutPenalty: {
      ready: { low: 10, moderate: 24, high: 32 },
      normal: { low: 14, moderate: 30, high: 40 },
      low: { low: 18, moderate: 38, high: 48 },
      recovery: { low: 22, moderate: 44, high: 56 },
      unselected: { low: 14, moderate: 30, high: 40 },
    } satisfies Record<ReadinessMode, Record<ActivityIntensity, number>>,
    buildMuscleGoalMultiplier: 0.25,
    perfectProgressBoost: 30,
    perfectProgressDifferencePenalty: 0.7,
  },
  stableGoalDefaults: {
    'get-more-active': 'low',
    'build-muscle': 'moderate',
    'improve-endurance': 'moderate',
    'feel-healthier': 'low',
  } satisfies Record<PrimaryGoal, ActivityIntensity>,
} as const;
