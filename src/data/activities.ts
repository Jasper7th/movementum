import { progressionConfig } from '../config/progression';
import type { ActivityDefinition } from '../domain/models';

export const activityCatalog = {
  'easy-walk': { id: 'easy-walk', title: 'Easy walk', detail: 'Comfortable movement with no pace target.', xp: progressionConfig.activityXp.easyWalk, category: 'recovery', durationMinutes: 10, weeklyContribution: 'light', intensity: 'low', goalAffinities: ['get-more-active', 'improve-endurance', 'feel-healthier'], accessOptions: [], recoveryFriendly: true },
  'walk-10': { id: 'walk-10', title: '10-minute walk', detail: 'Step outside or take a few laps indoors.', xp: progressionConfig.activityXp.tenMinuteWalk, category: 'endurance', durationMinutes: 10, weeklyContribution: 'light', intensity: 'low', goalAffinities: ['get-more-active', 'improve-endurance', 'feel-healthier'], accessOptions: [], recoveryFriendly: true },
  'walk-20': { id: 'walk-20', title: '20-minute walk', detail: 'A steady walk that fits into a normal day.', xp: progressionConfig.activityXp.longerWalk, category: 'endurance', durationMinutes: 20, weeklyContribution: 'light', intensity: 'low', goalAffinities: ['get-more-active', 'improve-endurance', 'feel-healthier'], accessOptions: [], recoveryFriendly: true },
  'quick-stretch': { id: 'quick-stretch', title: 'Quick stretch', detail: 'Loosen up with a few easy, comfortable stretches.', xp: progressionConfig.activityXp.quickStretch, category: 'recovery', durationMinutes: 5, weeklyContribution: 'light', intensity: 'low', goalAffinities: ['feel-healthier'], accessOptions: [], recoveryFriendly: true },
  'mobility-reset': { id: 'mobility-reset', title: 'Mobility reset', detail: 'Easy movement for your hips, back, and shoulders.', xp: progressionConfig.activityXp.mobilityReset, category: 'mobility', durationMinutes: 8, weeklyContribution: 'light', intensity: 'low', goalAffinities: ['feel-healthier'], accessOptions: [], recoveryFriendly: true },
  'simple-bodyweight': { id: 'simple-bodyweight', title: 'Simple bodyweight movement', detail: 'A short round of approachable, equipment-free movement.', xp: progressionConfig.activityXp.simpleBodyweight, category: 'strength', durationMinutes: 8, weeklyContribution: 'light', intensity: 'low', goalAffinities: ['get-more-active', 'build-muscle'], accessOptions: ['bodyweight'], recoveryFriendly: false },
  'bodyweight-workout': { id: 'bodyweight-workout', title: 'Bodyweight workout', detail: 'A focused session using the space you have.', xp: progressionConfig.activityXp.bodyweightWorkout, category: 'strength', durationMinutes: 25, weeklyContribution: 'workout', intensity: 'moderate', goalAffinities: ['build-muscle', 'get-more-active'], accessOptions: ['bodyweight'], recoveryFriendly: false },
  'moderate-workout': { id: 'moderate-workout', title: 'Moderate workout', detail: 'A balanced training session at a sustainable effort.', xp: progressionConfig.activityXp.moderateWorkout, category: 'strength', durationMinutes: 30, weeklyContribution: 'workout', intensity: 'moderate', goalAffinities: ['build-muscle', 'feel-healthier'], accessOptions: ['gym', 'home-equipment'], recoveryFriendly: false },
  'full-body': { id: 'full-body', title: 'Full-body workout', detail: 'A substantial session at your pace.', xp: progressionConfig.activityXp.fullBodyWorkout, category: 'strength', durationMinutes: 40, weeklyContribution: 'workout', intensity: 'high', goalAffinities: ['build-muscle'], accessOptions: ['gym', 'home-equipment'], recoveryFriendly: false },
  'steady-run': { id: 'steady-run', title: 'Steady run', detail: 'An easy-to-moderate outdoor run with a comfortable finish.', xp: progressionConfig.activityXp.steadyRun, category: 'endurance', durationMinutes: 30, weeklyContribution: 'workout', intensity: 'moderate', goalAffinities: ['improve-endurance'], accessOptions: ['outdoors'], recoveryFriendly: false },
} satisfies Record<string, ActivityDefinition>;

export type ActivityId = keyof typeof activityCatalog;
export function isActivityId(value: string): value is ActivityId {
  return value in activityCatalog;
}

export function getCompletedActivities(completedIds: ReadonlySet<ActivityId>): ActivityDefinition[] {
  return Array.from(completedIds, (id) => activityCatalog[id]);
}
