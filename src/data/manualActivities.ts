import type { WeeklyContribution } from '../domain/models';

export const manualActivityCategories = [
  { id: 'strength', label: 'Strength workout', contribution: 'workout' },
  { id: 'cardio', label: 'Cardio workout', contribution: 'workout' },
  { id: 'walk', label: 'Walk', contribution: 'light' },
  { id: 'run', label: 'Run', contribution: 'workout' },
  { id: 'mobility', label: 'Mobility / stretching', contribution: 'light' },
  { id: 'sport', label: 'Sport', contribution: 'workout' },
  { id: 'other', label: 'Other activity', contribution: null },
] as const satisfies readonly { id: string; label: string; contribution: WeeklyContribution | null }[];

export type ManualActivityCategoryId = (typeof manualActivityCategories)[number]['id'];
export type ManualActivityContribution = 'workout' | 'light';

export function getManualActivityCategory(id: ManualActivityCategoryId) {
  return manualActivityCategories.find((category) => category.id === id)!;
}

export function getManualCategoryContribution(
  id: ManualActivityCategoryId,
  otherContribution?: ManualActivityContribution,
): ManualActivityContribution | undefined {
  const contribution = getManualActivityCategory(id).contribution;
  return contribution ?? otherContribution;
}
