import { manualActivityConfig } from '../config/manualActivities';
import { getManualActivityCategory, getManualCategoryContribution, type ManualActivityCategoryId, type ManualActivityContribution } from '../data/manualActivities';
import type { ManualActivityInstance } from './models';

export interface CreateManualActivityInput {
  id: string;
  date: string;
  categoryId: ManualActivityCategoryId;
  durationMinutes: number;
  label?: string;
  otherContribution?: ManualActivityContribution;
  createdAt: string;
}

export function getManualActivityXp(contribution: ManualActivityContribution, durationMinutes: number): number {
  const safeDuration = Math.max(1, Math.floor(durationMinutes));
  return manualActivityConfig.xpCurves[contribution].find((step) => safeDuration <= step.upToMinutes)!.xp;
}

export function createManualActivity(input: CreateManualActivityInput): ManualActivityInstance {
  const contribution = getManualCategoryContribution(input.categoryId, input.otherContribution);
  if (!contribution) throw new Error('Other activities require a contribution type.');
  const durationMinutes = Math.max(1, Math.floor(input.durationMinutes));
  const label = input.label?.trim().slice(0, 40) || undefined;
  return {
    id: input.id,
    date: input.date,
    categoryId: input.categoryId,
    contribution,
    durationMinutes,
    xp: getManualActivityXp(contribution, durationMinutes),
    label,
    createdAt: input.createdAt,
  };
}

export function getManualActivityTitle(activity: ManualActivityInstance): string {
  return activity.label || getManualActivityCategory(activity.categoryId).label;
}
