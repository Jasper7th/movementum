import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppState } from '../application/AppStateProvider';
import { useAuth } from '../application/AuthProvider';
import { SocialProfileEditor } from '../components/SocialProfileEditor';
import { buildSocialProgressInput, getFriendTodayLabel, getRelationshipViewState, isSnapshotCurrent, type FriendSummary, type SocialDashboard, type SocialProfile } from '../domain/social';
import { socialService, type SocialSearchResult } from '../services/socialService';
import { colors, layout, radii, spacing, typography } from '../ui/theme';

export function FriendsScreen() {
  const { user } = useAuth();
  const { state } = useAppState();
  const [dashboard, setDashboard] = useState<SocialDashboard>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SocialSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionIds, setActionIds] = useState(new Set<string>());

  const load = useCallback(async (asRefresh = false) => {
    if (!user) return;
    if (asRefresh) setRefreshing(true); else setLoading(true);
    const result = await socialService.getDashboard(user.id);
    if (result.data) { setDashboard(result.data); setError(undefined); } else setError(result.error);
    setLoading(false); setRefreshing(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!user || query.trim().length < 2 || !dashboard?.profile) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => { void socialService.searchUsers(user.id, query).then((result) => { setSearching(false); if (result.data) { setResults(result.data); setError(undefined); } else setError(result.error); }); }, 350);
    return () => clearTimeout(timer);
  }, [dashboard?.profile, query, user]);

  const runAction = async (key: string, action: () => Promise<{ error?: string }>) => {
    if (actionIds.has(key)) return;
    setActionIds((current) => new Set(current).add(key));
    const result = await action();
    setActionIds((current) => { const next = new Set(current); next.delete(key); return next; });
    if (result.error) setError(result.error); else { await load(true); if (user && query.trim().length >= 2) { const search = await socialService.searchUsers(user.id, query); if (search.data) setResults(search.data); } }
  };

  const onProfileSaved = async (profile: SocialProfile) => {
    setDashboard((current) => current ? { ...current, profile } : { profile, incoming: [], outgoing: [], friends: [] });
    if (user) await socialService.upsertProgress(user.id, buildSocialProgressInput(state));
    await load(true);
  };

  if (!user) return null;
  if (loading && !dashboard) return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={colors.accent} /><Text style={styles.muted}>Loading friends…</Text></View></SafeAreaView>;
  if (dashboard && !dashboard.profile) return <SocialProfileEditor onSaved={(profile) => { void onProfileSaved(profile); }} />;
  if (!dashboard) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.emptyTitle}>Friends unavailable</Text><Text style={styles.muted}>{error ?? 'Check your connection and try again.'}</Text><ActionButton label="Try again" onPress={() => void load()} /></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} tintColor={colors.accent} />}><Text style={styles.eyebrow}>YOUR PEOPLE</Text><Text style={styles.title}>Friends</Text><Text style={styles.subtitle}>Keep each other moving.</Text>{error && <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>}{dashboard.incoming.length > 0 && <Section title="Requests">{dashboard.incoming.map(({ friendship, profile }) => <IdentityCard key={friendship.id} profile={profile}><View style={styles.inlineActions}><SmallButton busy={actionIds.has(friendship.id)} label="Accept" onPress={() => void runAction(friendship.id, () => socialService.acceptRequest(friendship.id))} primary /><SmallButton label="Decline" onPress={() => void runAction(friendship.id, () => socialService.declineRequest(friendship.id))} /></View></IdentityCard>)}</Section>}<Section title="Your friends">{dashboard.friends.length > 0 ? dashboard.friends.map((friend) => <FriendCard friend={friend} key={friend.friendship.id} onRemove={() => Alert.alert('Remove friend?', `${friend.profile.displayName} will no longer be able to see your Movementum progress.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void runAction(friend.friendship.id, () => socialService.removeFriend(friend.friendship.id)) }])} />) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Movementum is better with company.</Text><Text style={styles.muted}>Search for a friend by username.</Text></View>}</Section>{dashboard.outgoing.length > 0 && <Section title="Sent requests">{dashboard.outgoing.map(({ friendship, profile }) => <IdentityCard key={friendship.id} profile={profile}><SmallButton busy={actionIds.has(friendship.id)} label="Cancel" onPress={() => void runAction(friendship.id, () => socialService.cancelRequest(friendship.id))} /></IdentityCard>)}</Section>}<Section title="Find friends"><View style={styles.searchBox}><Ionicons color={colors.textMuted} name="search" size={18} /><Text style={styles.at}>@</Text><TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} placeholder="Search username" placeholderTextColor={colors.textMuted} style={styles.searchInput} value={query} />{searching && <ActivityIndicator color={colors.accent} size="small" />}</View>{query.trim().length >= 2 && !searching && results.length === 0 && <Text style={styles.searchEmpty}>No usernames found.</Text>}{results.map((result) => <SearchCard busy={actionIds.has(result.profile.userId)} currentUserId={user.id} key={result.profile.userId} onAdd={() => void runAction(result.profile.userId, () => socialService.sendRequest(result.profile.userId))} result={result} />)}</Section></ScrollView></SafeAreaView>;
}

function Section({ children, title }: { children: React.ReactNode; title: string }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionItems}>{children}</View></View>; }
function Avatar({ profile }: { profile: SocialProfile }) { return <View accessibilityElementsHidden style={styles.avatar}><Text style={styles.avatarText}>{profile.displayName.trim().charAt(0).toUpperCase() || '?'}</Text></View>; }
function IdentityCard({ children, profile }: { children?: React.ReactNode; profile: SocialProfile }) { return <View style={styles.identityCard}><Avatar profile={profile} /><View style={styles.identity}><Text numberOfLines={1} style={styles.name}>{profile.displayName}</Text><Text numberOfLines={1} style={styles.username}>@{profile.username}</Text></View>{children}</View>; }

function FriendCard({ friend, onRemove }: { friend: FriendSummary; onRemove: () => void }) {
  const current = friend.progress && isSnapshotCurrent(friend.progress);
  return <View style={styles.friendCard}><View style={styles.friendTop}><Avatar profile={friend.profile} /><View style={styles.identity}><Text numberOfLines={1} style={styles.name}>{friend.profile.displayName}</Text><Text style={styles.username}>@{friend.profile.username}</Text></View><Pressable accessibilityLabel={`Remove ${friend.profile.displayName} as a friend`} accessibilityRole="button" hitSlop={10} onPress={onRemove} style={({ pressed }) => pressed && styles.pressed}><Ionicons color={colors.textMuted} name="ellipsis-horizontal" size={20} /></Pressable></View>{friend.progress ? <><View style={styles.friendStats}><Text style={styles.friendStat}>Level {friend.progress.level}</Text><Text style={styles.friendStat}>🔥 {friend.progress.currentStreak} day streak</Text></View><View style={[styles.statusRow, !current && styles.statusStale]}><View><Text style={styles.statusTitle}>{getFriendTodayLabel(friend.progress)}</Text><Text style={styles.statusMeta}>{current ? `${friend.progress.todayXp} / ${friend.progress.dailyTarget} XP` : `Last updated ${formatSnapshotDate(friend.progress.updatedAt)}`}</Text></View>{current && friend.progress.todayPerfect && <View style={styles.perfectDot} />}</View></> : <Text style={styles.noSnapshot}>No progress update available yet.</Text>}</View>;
}

function SearchCard({ busy, currentUserId, onAdd, result }: { busy: boolean; currentUserId: string; onAdd: () => void; result: SocialSearchResult }) {
  const status = getRelationshipViewState(result.friendship, currentUserId);
  const labels = { none: 'Add friend', outgoing: 'Requested', incoming: 'Respond', friends: 'Friends' } as const;
  return <IdentityCard profile={result.profile}><SmallButton busy={busy} disabled={status !== 'none'} label={labels[status]} onPress={onAdd} primary={status === 'none'} /></IdentityCard>;
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}><Text style={styles.retryText}>{label}</Text></Pressable>; }
function SmallButton({ busy, disabled, label, onPress, primary }: { busy?: boolean; disabled?: boolean; label: string; onPress: () => void; primary?: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.smallButton, primary && styles.smallButtonPrimary, (disabled || busy) && styles.buttonDisabled, pressed && styles.pressed]}>{busy ? <ActivityIndicator color={primary ? colors.surface : colors.accent} size="small" /> : <Text style={[styles.smallButtonText, primary && styles.smallButtonTextPrimary]}>{label}</Text>}</Pressable>; }
function formatSnapshotDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'earlier' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }

const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, content: { gap: 8, paddingBottom: layout.pageBottom, paddingHorizontal: layout.pageHorizontal, paddingTop: layout.pageTop }, eyebrow: { color: colors.accent, ...typography.pageEyebrow }, title: { color: colors.text, ...typography.pageTitle }, subtitle: { color: colors.textMuted, marginBottom: spacing.sm, ...typography.body }, center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: layout.pageHorizontal }, muted: { color: colors.textMuted, textAlign: 'center', ...typography.body }, section: { gap: spacing.sm, marginTop: spacing.md }, sectionTitle: { color: colors.text, ...typography.sectionTitle }, sectionItems: { gap: spacing.sm }, identityCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 68, padding: 12 }, avatar: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 }, avatarText: { color: colors.accent, fontSize: 16, fontWeight: '900' }, identity: { flex: 1, minWidth: 0 }, name: { color: colors.text, fontSize: 15, fontWeight: '800' }, username: { color: colors.textMuted, fontSize: 12, marginTop: 2 }, inlineActions: { flexDirection: 'row', gap: 6 }, smallButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 36, minWidth: 66, paddingHorizontal: 9 }, smallButtonPrimary: { backgroundColor: colors.accent, borderColor: colors.accent }, smallButtonText: { color: colors.accent, fontSize: 11, fontWeight: '800' }, smallButtonTextPrimary: { color: colors.surface }, buttonDisabled: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, opacity: 0.75 }, emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, gap: 6, padding: spacing.lg }, emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' }, searchBox: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, flexDirection: 'row', minHeight: 50, paddingHorizontal: 13 }, searchInput: { color: colors.text, flex: 1, fontSize: 15, minHeight: 48 }, at: { color: colors.accent, fontSize: 15, fontWeight: '800', marginLeft: 7 }, searchEmpty: { color: colors.textMuted, paddingVertical: spacing.sm, textAlign: 'center', ...typography.helper }, friendCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, gap: 12, padding: 14 }, friendTop: { alignItems: 'center', flexDirection: 'row', gap: 12 }, friendStats: { flexDirection: 'row', gap: 8 }, friendStat: { backgroundColor: colors.accentSoft, borderRadius: 9, color: colors.accent, fontSize: 11, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6 }, statusRow: { alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', padding: 11 }, statusStale: { opacity: 0.72 }, statusTitle: { color: colors.text, fontSize: 13, fontWeight: '800' }, statusMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 }, perfectDot: { backgroundColor: colors.warm, borderRadius: 5, height: 10, width: 10 }, noSnapshot: { color: colors.textMuted, ...typography.helper }, errorBanner: { backgroundColor: '#FCE9E6', borderRadius: 10, marginTop: spacing.sm, padding: 10 }, errorText: { color: '#9B4339', fontSize: 12, lineHeight: 17 }, retry: { backgroundColor: colors.accent, borderRadius: radii.small, minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg }, retryText: { color: colors.surface, fontWeight: '800' }, pressed: { opacity: 0.62 } });
