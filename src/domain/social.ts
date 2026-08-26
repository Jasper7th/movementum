import { progressionConfig } from '../config/progression';
import { toLocalDateKey } from './calendar';
import { classifyDailyState } from './dayClassification';
import { getLevelFromLifetimeXp } from './levels';
import { getLifetimeStats } from './lifetime';
import type { DayClassification, PersistedAppState } from './models';

export interface SocialProfile {
  userId: string;
  username: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export type FriendshipStatus = 'pending' | 'accepted';
export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SocialProgressSnapshot {
  userId: string;
  level: number;
  currentStreak: number;
  todayStatus: DayClassification;
  todayPerfect: boolean;
  todayXp: number;
  dailyTarget: number;
  snapshotDate: string;
  updatedAt: string;
}

export interface SocialProgressInput extends Omit<SocialProgressSnapshot, 'userId' | 'updatedAt'> {}
export interface FriendSummary { friendship: Friendship; profile: SocialProfile; progress?: SocialProgressSnapshot }
export interface SocialDashboard {
  profile: SocialProfile | null;
  incoming: Array<{ friendship: Friendship; profile: SocialProfile }>;
  outgoing: Array<{ friendship: Friendship; profile: SocialProfile }>;
  friends: FriendSummary[];
}

export type RelationshipViewState = 'none' | 'outgoing' | 'incoming' | 'friends';

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, '');
}

export function validateUsername(value: string): string | undefined {
  const username = normalizeUsername(value);
  if (username.length < 3 || username.length > 20) return 'Username must be 3–20 characters.';
  return /^[a-z0-9_]+$/.test(username) ? undefined : 'Use only letters, numbers, and underscores.';
}

export function validateDisplayName(value: string): string | undefined {
  const displayName = value.trim();
  return displayName.length >= 1 && displayName.length <= 40 ? undefined : 'Display name must be 1–40 characters.';
}

export function getRelationshipViewState(friendship: Friendship | undefined, currentUserId: string): RelationshipViewState {
  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'friends';
  return friendship.requesterId === currentUserId ? 'outgoing' : 'incoming';
}

export function buildSocialProgressInput(state: PersistedAppState): SocialProgressInput {
  const lifetime = getLifetimeStats(state.progress, state.daily);
  return {
    level: getLevelFromLifetimeXp(lifetime.lifetimeXp),
    currentStreak: state.progress.currentStreak,
    todayStatus: classifyDailyState(state.daily),
    todayPerfect: state.daily.earnedXp >= progressionConfig.dailyXpTarget,
    todayXp: state.daily.earnedXp,
    dailyTarget: progressionConfig.dailyXpTarget,
    snapshotDate: state.daily.date,
  };
}

export function isSnapshotCurrent(snapshot: SocialProgressSnapshot, today = toLocalDateKey()): boolean {
  return snapshot.snapshotDate === today;
}

export function getFriendTodayLabel(snapshot: SocialProgressSnapshot, today = toLocalDateKey()): string {
  if (!isSnapshotCurrent(snapshot, today)) return 'No current update today';
  const primary: Record<DayClassification, string> = { inactive: 'Not active yet', 'active-unclassified': 'Active Day', workout: 'Workout Day', light: 'Light / Recovery Day' };
  return snapshot.todayPerfect ? `${primary[snapshot.todayStatus]} · Perfect` : primary[snapshot.todayStatus];
}

export function getSocialErrorMessage(error: unknown): string {
  const candidate = error as { code?: string; message?: string } | null;
  if (candidate?.code === '23505' || /duplicate.*username|unique.*username/i.test(candidate?.message ?? '')) return 'That username is already taken.';
  if (/network|fetch|offline/i.test(candidate?.message ?? '')) return 'Friends are unavailable offline. Try again when you’re connected.';
  if (/cannot friend yourself/i.test(candidate?.message ?? '')) return 'You cannot send a friend request to yourself.';
  return 'Friends could not be updated. Please try again.';
}
