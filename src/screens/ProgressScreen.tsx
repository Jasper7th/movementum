import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../application/AppStateProvider';
import { AchievementCard } from '../components/AchievementCard';
import { CompactStatCard } from '../components/CompactStatCard';
import { SectionHeader } from '../components/SectionHeader';
import { progressionConfig } from '../config/progression';
import { achievementCatalog } from '../data/achievements';
import { getAchievementPreview } from '../domain/achievements';
import { toLocalDateKey } from '../domain/calendar';
import { getLevelProgress } from '../domain/levels';
import { getLifetimeStats } from '../domain/lifetime';
import { getWeeklySummary } from '../domain/streaks';
import { cardPadding, colors, layout, radii, spacing, typography } from '../ui/theme';

export function ProgressScreen({ onViewAchievements, onViewHistory }: { onViewAchievements: () => void; onViewHistory: () => void }) {
  const { state } = useAppState();
  const preferences = state.preferences;
  const week = getWeeklySummary(state.progress, state.daily, toLocalDateKey());
  const lifetime = getLifetimeStats(state.progress, state.daily);
  const level = getLevelProgress(lifetime.lifetimeXp);
  const achievementPreview = getAchievementPreview(state);
  const unlockedAchievements = state.achievements.length;
  if (!preferences) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR MOVEMENTUM</Text><Text style={styles.title}>Progress</Text><Text style={styles.subtitle}>Every active day adds to the story you’re building.</Text>
      <Pressable accessibilityRole="button" onPress={onViewHistory} style={({ pressed }) => [styles.historyAction, pressed && styles.pressed]}><View><Text style={styles.historyActionTitle}>Activity history</Text><Text style={styles.historyActionCopy}>See the consistency you’ve built over time.</Text></View><Text style={styles.historyActionArrow}>›</Text></Pressable>
      <View style={styles.levelCard}>
        <View style={styles.levelRow}><View><Text style={styles.levelEyebrow}>OVERALL LEVEL</Text><Text style={styles.levelValue}>Level {level.level}</Text></View><Text style={styles.lifetimeXp}>{level.lifetimeXp.toLocaleString()} XP</Text></View>
        <View style={styles.levelTrack}><View style={[styles.levelFill, { width: `${level.progress * 100}%` }]} /></View>
        <Text style={styles.levelHint}>{level.xpWithinLevel} / {level.xpRequiredForNextLevel} XP toward Level {level.level + 1}</Text>
      </View>
      <Text style={styles.sectionTitle}>Streak</Text>
      <View style={styles.streakCard}><View style={styles.streakStat}><Text style={styles.streakValue}>{formatDays(state.progress.currentStreak)}</Text><Text style={styles.streakLabel}>Current streak</Text></View><View style={styles.streakDivider} /><View style={styles.streakStat}><Text style={styles.streakValue}>{formatDays(state.progress.longestStreak)}</Text><Text style={styles.streakLabel}>Longest streak</Text></View></View>
      <Text style={styles.sectionTitle}>Your week</Text>
      <View style={styles.planCard}>
        <PlanRow actual={week.workoutDays} label="Workout days" target={preferences.workoutDaysPerWeek} />
        <View style={styles.planDivider} />
        <PlanRow actual={week.lightDays} label="Light / recovery days" target={preferences.activeRecoveryDaysPerWeek} />
      </View>
      <View style={styles.grid}>
        <CompactStatCard label="Active days" value={week.activeDays} />
        <CompactStatCard label="Perfect days" value={week.fullDays} />
        <CompactStatCard label="Today’s XP" value={`${state.daily.earnedXp}/${progressionConfig.dailyXpTarget}`} />
      </View>
      {week.unclassifiedActiveDays > 0 && <Text style={styles.unclassifiedNote}>{week.unclassifiedActiveDays} migrated active {week.unclassifiedActiveDays === 1 ? 'day is' : 'days are'} not assigned to a weekly-plan type.</Text>}
      <SectionHeader action={<Pressable accessibilityRole="button" onPress={onViewAchievements} style={({ pressed }) => [styles.viewAll, pressed && styles.pressed]}><Text style={styles.viewAllText}>View all ›</Text></Pressable>} helper={`${unlockedAchievements} / ${achievementCatalog.length} unlocked`} title="Achievements" />
      <View style={styles.achievementList}>{achievementPreview.map((summary) => <AchievementCard compact key={summary.definition.id} summary={summary} />)}</View>
      <Text style={styles.sectionTitle}>Lifetime</Text>
      <View style={styles.lifetimeGrid}><View style={styles.grid}><CompactStatCard label="Active days" value={lifetime.activeDays} /><CompactStatCard label="Workout days" value={lifetime.workoutDays} /></View><View style={styles.grid}><CompactStatCard label="Light / recovery" value={lifetime.lightDays} /><CompactStatCard label="Perfect days" value={lifetime.perfectDays} /></View></View>
      {lifetime.unclassifiedActiveDays > 0 && <Text style={styles.unclassifiedNote}>{lifetime.unclassifiedActiveDays} historical active {lifetime.unclassifiedActiveDays === 1 ? 'day remains' : 'days remain'} unclassified.</Text>}
    </ScrollView>
    </SafeAreaView>
  );
}

function formatDays(value: number): string {
  return `${value} ${value === 1 ? 'day' : 'days'}`;
}

function PlanRow({ actual, label, target }: { actual: number; label: string; target: number }) {
  const supporting = target === 0
    ? (actual > 0 ? `${actual} completed outside your current plan` : 'Not part of your current plan')
    : actual >= target ? 'Target reached — extra days still count' : `${target - actual} ${target - actual === 1 ? 'day' : 'days'} remaining`;
  return <View style={styles.planRow}><View style={styles.planCopy}><Text style={styles.planLabel}>{label}</Text><Text style={styles.planSupporting}>{supporting}</Text></View><Text style={styles.planCount}>{target === 0 ? '—' : `${actual} / ${target}`}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 }, content: { gap: 13, paddingBottom: layout.pageBottom, paddingHorizontal: layout.pageHorizontal, paddingTop: layout.pageTop }, eyebrow: { color: colors.accent, ...typography.pageEyebrow }, title: { color: colors.text, ...typography.pageTitle }, subtitle: { color: colors.textMuted, marginBottom: spacing.xs, ...typography.body },
  levelCard: { backgroundColor: colors.text, borderRadius: radii.large, gap: 11, padding: cardPadding.primary }, levelRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }, levelEyebrow: { color: '#AFC4B5', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, levelValue: { color: colors.surface, fontSize: 30, fontWeight: '800', marginTop: 3 }, lifetimeXp: { color: '#FFD09B', flexShrink: 1, fontSize: 16, fontWeight: '800', textAlign: 'right' }, levelTrack: { backgroundColor: '#344239', borderRadius: 6, height: 10, overflow: 'hidden' }, levelFill: { backgroundColor: colors.warm, borderRadius: 6, height: '100%' }, levelHint: { color: '#C5D0C8', fontSize: 12 },
  sectionTitle: { color: colors.text, marginTop: spacing.xs, ...typography.sectionTitle }, streakCard: { alignItems: 'stretch', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, flexDirection: 'row', paddingVertical: cardPadding.secondary }, streakStat: { alignItems: 'center', flex: 1 }, streakValue: { color: colors.text, fontSize: 20, fontWeight: '800' }, streakLabel: { color: colors.textMuted, marginTop: 2, ...typography.count }, streakDivider: { backgroundColor: colors.border, width: StyleSheet.hairlineWidth },
  grid: { flexDirection: 'row', gap: spacing.sm },
  planCard: { backgroundColor: colors.accentSoft, borderRadius: radii.medium, paddingHorizontal: cardPadding.secondary }, planRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', paddingVertical: 14 }, planCopy: { flex: 1 }, planLabel: { color: colors.text, fontSize: 15, fontWeight: '800' }, planSupporting: { color: colors.textMuted, marginTop: 3, ...typography.count }, planCount: { color: colors.accent, fontSize: 20, fontWeight: '800' }, planDivider: { backgroundColor: '#C7E0D0', height: StyleSheet.hairlineWidth }, unclassifiedNote: { color: colors.textMuted, ...typography.helper }, lifetimeGrid: { gap: spacing.sm },
  achievementList: { gap: spacing.sm }, viewAll: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 6 }, viewAllText: { color: colors.accent, fontSize: 12, fontWeight: '800' }, pressed: { opacity: 0.65 },
  historyAction: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radii.medium, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: cardPadding.secondary, paddingVertical: 13 }, historyActionTitle: { color: colors.text, fontSize: 14, fontWeight: '800' }, historyActionCopy: { color: colors.textMuted, fontSize: 11, marginTop: 2 }, historyActionArrow: { color: colors.accent, fontSize: 25 },
});
