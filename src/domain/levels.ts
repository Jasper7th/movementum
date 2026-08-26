import { progressionConfig } from '../config/progression';

export interface LevelProgress {
  level: number;
  lifetimeXp: number;
  levelStartXp: number;
  nextLevelAtXp: number;
  xpWithinLevel: number;
  xpRequiredForNextLevel: number;
  xpRemaining: number;
  progress: number;
}

export function getXpRequiredForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return progressionConfig.levelCurve.baseXpPerLevel
    + (safeLevel - 1) * progressionConfig.levelCurve.additionalXpPerLevel;
}

export function getLifetimeXpRequiredForLevel(level: number): number {
  const completedLevels = Math.max(0, Math.floor(level) - 1);
  const base = progressionConfig.levelCurve.baseXpPerLevel;
  const increase = progressionConfig.levelCurve.additionalXpPerLevel;
  return completedLevels * (2 * base + (completedLevels - 1) * increase) / 2;
}

export function getLevelFromLifetimeXp(lifetimeXp: number): number {
  const safeXp = Math.max(0, lifetimeXp);
  let level = 1;
  while (safeXp >= getLifetimeXpRequiredForLevel(level + 1)) level += 1;
  return level;
}

export function getLevelProgress(lifetimeXp: number): LevelProgress {
  const safeXp = Math.max(0, lifetimeXp);
  const level = getLevelFromLifetimeXp(safeXp);
  const levelStartXp = getLifetimeXpRequiredForLevel(level);
  const xpRequiredForNextLevel = getXpRequiredForNextLevel(level);
  const xpWithinLevel = safeXp - levelStartXp;
  return {
    level,
    lifetimeXp: safeXp,
    levelStartXp,
    nextLevelAtXp: levelStartXp + xpRequiredForNextLevel,
    xpWithinLevel,
    xpRequiredForNextLevel,
    xpRemaining: xpRequiredForNextLevel - xpWithinLevel,
    progress: Math.min(xpWithinLevel / xpRequiredForNextLevel, 1),
  };
}

export function getLevelsCrossed(previousLevel: number, currentLevel: number): number[] {
  if (currentLevel <= previousLevel) return [];
  return Array.from(
    { length: currentLevel - previousLevel },
    (_, index) => previousLevel + index + 1,
  );
}
