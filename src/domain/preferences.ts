import type { ActivityAccess, PrimaryGoal, StartingActivityLevel } from './models';

export const primaryGoalLabels: Record<PrimaryGoal, string> = {
  'get-more-active': 'Get more active',
  'build-muscle': 'Build muscle',
  'improve-endurance': 'Improve endurance',
  'feel-healthier': 'Feel healthier',
};

export const activityAccessLabels: Record<ActivityAccess, string> = {
  gym: 'Gym',
  'home-equipment': 'Home equipment',
  bodyweight: 'Bodyweight',
  outdoors: 'Outdoors',
};

export const activityLevelLabels: Record<StartingActivityLevel, string> = {
  'not-very-active': 'Not very active',
  'somewhat-active': 'Somewhat active',
  active: 'Active',
  'very-active': 'Very active',
};
