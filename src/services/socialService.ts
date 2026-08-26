import type { FriendSummary, Friendship, SocialDashboard, SocialProfile, SocialProgressInput, SocialProgressSnapshot } from '../domain/social';
import { getSocialErrorMessage, normalizeUsername } from '../domain/social';
import { supabase } from './supabaseClient';

export interface SocialResult<T> { data?: T; error?: string }
export interface SocialSearchResult { profile: SocialProfile; friendship?: Friendship }

type Row = Record<string, unknown>;
const unavailable = <T>(): SocialResult<T> => ({ error: 'Friends are unavailable until Supabase is configured.' });
const profileFromRow = (row: Row): SocialProfile => ({ userId: String(row.user_id), username: String(row.username), displayName: String(row.display_name), createdAt: String(row.created_at), updatedAt: String(row.updated_at) });
const friendshipFromRow = (row: Row): Friendship => ({ id: String(row.id), requesterId: String(row.requester_id), addresseeId: String(row.addressee_id), status: row.status as Friendship['status'], createdAt: String(row.created_at), updatedAt: String(row.updated_at) });
const progressFromRow = (row: Row): SocialProgressSnapshot => ({ userId: String(row.user_id), level: Number(row.level), currentStreak: Number(row.current_streak), todayStatus: row.today_status as SocialProgressSnapshot['todayStatus'], todayPerfect: Boolean(row.today_perfect), todayXp: Number(row.today_xp), dailyTarget: Number(row.daily_target), snapshotDate: String(row.snapshot_date), updatedAt: String(row.updated_at) });

async function getRelationships(userId: string): Promise<SocialResult<Friendship[]>> {
  if (!supabase) return unavailable();
  const { data, error } = await supabase.from('friendships').select('*').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).order('created_at', { ascending: false });
  return error ? { error: getSocialErrorMessage(error) } : { data: (data as Row[]).map(friendshipFromRow) };
}

async function getProfiles(userIds: string[]): Promise<SocialResult<SocialProfile[]>> {
  if (!supabase) return unavailable();
  if (userIds.length === 0) return { data: [] };
  const { data, error } = await supabase.from('social_profiles').select('user_id,username,display_name,created_at,updated_at').in('user_id', userIds);
  return error ? { error: getSocialErrorMessage(error) } : { data: (data as Row[]).map(profileFromRow) };
}

export const socialService = {
  async getMyProfile(userId: string): Promise<SocialResult<SocialProfile | null>> {
    if (!supabase) return unavailable();
    const { data, error } = await supabase.from('social_profiles').select('user_id,username,display_name,created_at,updated_at').eq('user_id', userId).maybeSingle();
    return error ? { error: getSocialErrorMessage(error) } : { data: data ? profileFromRow(data as Row) : null };
  },

  async saveProfile(userId: string, username: string, displayName: string): Promise<SocialResult<SocialProfile>> {
    if (!supabase) return unavailable();
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('social_profiles').upsert({ user_id: userId, username: normalizeUsername(username), display_name: displayName.trim(), updated_at: now }, { onConflict: 'user_id' }).select('user_id,username,display_name,created_at,updated_at').single();
    return error ? { error: getSocialErrorMessage(error) } : { data: profileFromRow(data as Row) };
  },

  async getDashboard(userId: string): Promise<SocialResult<SocialDashboard>> {
    const [profileResult, relationshipsResult] = await Promise.all([this.getMyProfile(userId), getRelationships(userId)]);
    if (profileResult.error || relationshipsResult.error) return { error: profileResult.error ?? relationshipsResult.error };
    const relationships = relationshipsResult.data ?? [];
    const otherIds = relationships.map((item) => item.requesterId === userId ? item.addresseeId : item.requesterId);
    const acceptedIds = relationships.filter((item) => item.status === 'accepted').map((item) => item.requesterId === userId ? item.addresseeId : item.requesterId);
    const [profilesResult, progressResult] = await Promise.all([
      getProfiles([...new Set(otherIds)]),
      acceptedIds.length === 0 || !supabase
        ? Promise.resolve<SocialResult<SocialProgressSnapshot[]>>({ data: [] })
        : supabase.from('social_progress').select('*').in('user_id', [...new Set(acceptedIds)]).then(({ data, error }) => error ? { error: getSocialErrorMessage(error) } : { data: (data as Row[]).map(progressFromRow) }),
    ]);
    if (profilesResult.error || progressResult.error) return { error: profilesResult.error ?? progressResult.error };
    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.userId, profile]));
    const progress = new Map((progressResult.data ?? []).map((snapshot) => [snapshot.userId, snapshot]));
    const incoming: SocialDashboard['incoming'] = [];
    const outgoing: SocialDashboard['outgoing'] = [];
    const friends: FriendSummary[] = [];
    relationships.forEach((friendship) => {
      const otherId = friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId;
      const profile = profiles.get(otherId);
      if (!profile) return;
      if (friendship.status === 'accepted') friends.push({ friendship, profile, progress: progress.get(otherId) });
      else if (friendship.addresseeId === userId) incoming.push({ friendship, profile });
      else outgoing.push({ friendship, profile });
    });
    return { data: { profile: profileResult.data ?? null, incoming, outgoing, friends } };
  },

  async searchUsers(userId: string, query: string): Promise<SocialResult<SocialSearchResult[]>> {
    if (!supabase) return unavailable();
    const normalized = normalizeUsername(query);
    if (!normalized) return { data: [] };
    const [profilesQuery, relationshipsResult] = await Promise.all([
      supabase.from('social_profiles').select('user_id,username,display_name,created_at,updated_at').ilike('username', `${normalized}%`).neq('user_id', userId).order('username').limit(15),
      getRelationships(userId),
    ]);
    if (profilesQuery.error || relationshipsResult.error) return { error: profilesQuery.error ? getSocialErrorMessage(profilesQuery.error) : relationshipsResult.error };
    const byOtherId = new Map((relationshipsResult.data ?? []).map((friendship) => [friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId, friendship]));
    return { data: (profilesQuery.data as Row[]).map(profileFromRow).map((profile) => ({ profile, friendship: byOtherId.get(profile.userId) })) };
  },

  async sendRequest(targetUserId: string): Promise<SocialResult<void>> { return this.callRelationshipRpc('send_friend_request', { target_user_id: targetUserId }); },
  async acceptRequest(friendshipId: string): Promise<SocialResult<void>> { return this.callRelationshipRpc('accept_friend_request', { friendship_id: friendshipId }); },
  async declineRequest(friendshipId: string): Promise<SocialResult<void>> { return this.callRelationshipRpc('decline_friend_request', { friendship_id: friendshipId }); },
  async cancelRequest(friendshipId: string): Promise<SocialResult<void>> { return this.callRelationshipRpc('cancel_friend_request', { friendship_id: friendshipId }); },
  async removeFriend(friendshipId: string): Promise<SocialResult<void>> { return this.callRelationshipRpc('remove_friend', { friendship_id: friendshipId }); },

  async callRelationshipRpc(name: string, args: Record<string, string>): Promise<SocialResult<void>> {
    if (!supabase) return unavailable();
    const { error } = await supabase.rpc(name, args);
    return error ? { error: getSocialErrorMessage(error) } : { data: undefined };
  },

  async upsertProgress(userId: string, input: SocialProgressInput): Promise<SocialResult<void>> {
    if (!supabase) return unavailable();
    const { error } = await supabase.from('social_progress').upsert({ user_id: userId, level: input.level, current_streak: input.currentStreak, today_status: input.todayStatus, today_perfect: input.todayPerfect, today_xp: input.todayXp, daily_target: input.dailyTarget, snapshot_date: input.snapshotDate, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    return error ? { error: getSocialErrorMessage(error) } : { data: undefined };
  },
};
