import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../application/AppStateProvider';
import { ActivityCard } from '../components/ActivityCard';
import { LevelProgressStrip } from '../components/LevelProgressStrip';
import { ManualActivityModal } from '../components/ManualActivityModal';
import { ProgressCard } from '../components/ProgressCard';
import { ReadinessPicker } from '../components/ReadinessPicker';
import { SectionHeader } from '../components/SectionHeader';
import { progressionConfig } from '../config/progression';
import { activityCatalog, getCompletedActivities, isActivityId, type ActivityId } from '../data/activities';
import { getManualActivityCategory, getManualCategoryContribution } from '../data/manualActivities';
import { toLocalDateKey } from '../domain/calendar';
import { classifyDailyState, dayClassificationLabels } from '../domain/dayClassification';
import { getLevelProgress } from '../domain/levels';
import { getLifetimeStats } from '../domain/lifetime';
import { getManualActivityTitle, getManualActivityXp, type CreateManualActivityInput } from '../domain/manualActivities';
import { getRecommendedActivities, getRecommendationReasonCopy } from '../domain/recommendations';
import { getWeeklySummary } from '../domain/streaks';
import { cardPadding, colors, controlHeights, layout, radii, spacing, typography } from '../ui/theme';

interface TodayScreenProps {
  onOpenProgress: () => void;
}

export function TodayScreen({ onOpenProgress }: TodayScreenProps) {
  const { state, setReadiness, completeActivity, uncompleteActivity, logActivity, removeLoggedActivity } = useAppState();
  const [completionFeedback, setCompletionFeedback] = useState<string>();
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const completedIds = useMemo<ReadonlySet<ActivityId>>(
    () => new Set(state.daily.completedActivityIds.filter(isActivityId)),
    [state.daily.completedActivityIds],
  );
  const today = toLocalDateKey();
  const week = getWeeklySummary(state.progress, state.daily, today);
  const classification = classifyDailyState(state.daily);
  const recommendations = useMemo(() => state.preferences ? getRecommendedActivities({
    readiness: state.daily.readiness,
    preferences: state.preferences,
    weekly: { workoutDays: week.workoutDays, lightDays: week.lightDays },
    recentHistory: state.progress.history,
    daily: state.daily,
    todayClassification: classification,
    today,
  }) : [], [classification, state.daily, state.preferences, state.progress.history, today, week.lightDays, week.workoutDays]);
  const remainingActivities = useMemo(
    () => recommendations.map((recommendation) => activityCatalog[recommendation.activityId]),
    [recommendations],
  );
  const availableActivities = useMemo(
    () => remainingActivities.map((activity) => ({ ...activity, completed: false })),
    [remainingActivities],
  );
  const completedActivities = useMemo(() => getCompletedActivities(completedIds), [completedIds]);
  const completedCount = completedActivities.length + state.daily.manualActivities.length;
  const progress = { earnedXp: state.daily.earnedXp, targetXp: progressionConfig.dailyXpTarget, activeDayThreshold: progressionConfig.activeDayXpThreshold };
  const levelProgress = getLevelProgress(getLifetimeStats(state.progress, state.daily).lifetimeXp);

  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);
  useEffect(() => { if (completedCount === 0) setCompletedExpanded(false); }, [completedCount]);

  const handleComplete = (id: string) => {
    if (!isActivityId(id) || completedIds.has(id)) return;
    completeActivity(id);
    setCompletionFeedback(`${activityCatalog[id].title} completed · +${activityCatalog[id].xp} XP`);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setCompletionFeedback(undefined), 2200);
  };

  const handleUncomplete = (id: ActivityId) => {
    if (!completedIds.has(id)) return;
    uncompleteActivity(id);
    setCompletionFeedback(`${activityCatalog[id].title} unchecked · −${activityCatalog[id].xp} XP`);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setCompletionFeedback(undefined), 2200);
  };

  const handleLogActivity = (input: Omit<CreateManualActivityInput, 'id' | 'date' | 'createdAt'>) => {
    const contribution = getManualCategoryContribution(input.categoryId, input.otherContribution);
    if (!contribution) return;
    const xp = getManualActivityXp(contribution, input.durationMinutes);
    logActivity(input);
    const title = input.label?.trim() || getManualActivityCategory(input.categoryId).label;
    setCompletionFeedback(`${title} logged · +${xp} XP`);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setCompletionFeedback(undefined), 2200);
  };

  const handleRemoveLogged = (id: string) => {
    const activity = state.daily.manualActivities.find((item) => item.id === id);
    if (!activity) return;
    removeLoggedActivity(id);
    setCompletionFeedback(`${getManualActivityTitle(activity)} removed · −${activity.xp} XP`);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setCompletionFeedback(undefined), 2200);
  };

  const completedCollapsible = completedCount > 2;
  const showCompletedRows = !completedCollapsible || completedExpanded;

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={styles.kicker}>TODAY</Text><Text style={styles.title}>Make today count.</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>M</Text></View></View>
      <LevelProgressStrip onPress={onOpenProgress} progress={levelProgress} />
      <View style={styles.progressGroup}><ProgressCard availableActivities={remainingActivities} currentStreak={state.progress.currentStreak} progress={progress} />{classification !== 'inactive' && <View style={styles.classificationPill}><Text style={styles.classificationText}>✓ {dayClassificationLabels[classification]}</Text></View>}{completionFeedback && <View accessibilityLiveRegion="polite" style={styles.feedback}><Text style={styles.feedbackText}>{completionFeedback}</Text></View>}</View>
      <View style={styles.section}><SectionHeader helper="Optional — shapes today’s suggestions." title="How are you feeling?" /><ReadinessPicker value={state.daily.readiness} onChange={setReadiness} /></View>
      <View style={styles.section}>
        <SectionHeader action={<View style={styles.waysActions}><Text style={styles.availableCount}>{remainingActivities.length === 0 ? 'All done' : `${remainingActivities.length} available`}</Text><Pressable accessibilityRole="button" onPress={() => setLogModalVisible(true)} style={({ pressed }) => [styles.logAction, pressed && styles.pressed]}><Text style={styles.logActionText}>+ Log activity</Text></Pressable></View>} helper="Choose what fits your day." title="Ways to move" />
        <View style={styles.activityList}>{availableActivities.map((activity, index) => <ActivityCard activity={activity} key={activity.id} onComplete={handleComplete} reason={index === 0 ? getRecommendationReasonCopy(recommendations[0].reasonCode) : undefined} recommended={index === 0} />)}{availableActivities.length === 0 && <Text style={styles.emptyText}>You’ve completed the current suggestions.</Text>}</View>
      </View>
      {completedCount > 0 && <View style={styles.section}>
        {completedCollapsible ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: completedExpanded }} onPress={() => setCompletedExpanded((current) => !current)} style={({ pressed }) => [styles.completedHeader, pressed && styles.pressed]}><View><Text style={styles.sectionTitle}>Completed today</Text><Text style={styles.completedCount}>{completedCount} completed</Text></View><Text style={styles.chevron}>{completedExpanded ? '⌃' : '⌄'}</Text></Pressable> : <SectionHeader meta={`${completedCount} completed`} title="Completed today" />}
        {!showCompletedRows && <Pressable accessibilityRole="button" accessibilityState={{ expanded: false }} onPress={() => setCompletedExpanded(true)} style={({ pressed }) => [styles.completedSummary, pressed && styles.pressed]}><Text style={styles.completedSummaryText}>{completedCount} activities completed</Text><Text style={styles.completedSummaryHint}>Tap to review</Text></Pressable>}
        {showCompletedRows && <View style={styles.completedList}>
          {completedActivities.map((activity, index) => <View key={`suggested-${activity.id}`} style={[styles.completedRow, index < completedCount - 1 && styles.completedRowBorder]}><View style={styles.completedCopy}><Text style={styles.completedTitle}>{activity.title}</Text><Text style={styles.completedMeta}>{activity.durationMinutes} min · {activity.xp} XP</Text></View><Pressable accessibilityHint="Removes this activity and its XP from today" accessibilityLabel={`Uncomplete ${activity.title}`} accessibilityRole="button" onPress={() => isActivityId(activity.id) && handleUncomplete(activity.id)} style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}><Text style={styles.doneButtonText}>✓ Done</Text></Pressable></View>)}
          {state.daily.manualActivities.map((activity, index) => { const category = getManualActivityCategory(activity.categoryId); const rowIndex = completedActivities.length + index; return <View key={activity.id} style={[styles.completedRow, rowIndex < completedCount - 1 && styles.completedRowBorder]}><View style={styles.completedCopy}><View style={styles.manualTitleRow}><Text style={styles.completedTitle}>{getManualActivityTitle(activity)}</Text><Text style={styles.manualBadge}>LOGGED</Text></View><Text style={styles.completedMeta}>{activity.durationMinutes} min{activity.label ? ` · ${category.label}` : ''} · {activity.xp} XP</Text></View><Pressable accessibilityHint="Removes this logged activity and its XP from today" accessibilityLabel={`Remove ${getManualActivityTitle(activity)}`} accessibilityRole="button" onPress={() => handleRemoveLogged(activity.id)} style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}><Text style={styles.doneButtonText}>✓ Done</Text></Pressable></View>; })}
        </View>}
      </View>}
      <View style={styles.weekCard}><View style={styles.weekStat}><Text style={styles.weekValue}>{week.activeDays} {week.activeDays === 1 ? 'day' : 'days'}</Text><Text style={styles.weekLabel}>active this week</Text></View><View style={styles.divider} /><View style={styles.weekStat}><Text style={styles.weekValue}>{state.progress.currentStreak} {state.progress.currentStreak === 1 ? 'day' : 'days'}</Text><Text style={styles.weekLabel}>current streak</Text></View></View>
    </ScrollView>
    <ManualActivityModal onClose={() => setLogModalVisible(false)} onLog={handleLogActivity} visible={logModalVisible} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 }, content: { gap: layout.sectionGap, paddingBottom: layout.pageBottom, paddingHorizontal: layout.pageHorizontal, paddingTop: layout.pageTop }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  kicker: { color: colors.accent, ...typography.pageEyebrow }, title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginTop: spacing.xs },
  avatar: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 }, avatarText: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  progressGroup: { gap: spacing.sm }, classificationPill: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 6 }, classificationText: { color: colors.accent, fontSize: 11, fontWeight: '800' }, feedback: { backgroundColor: '#FFF0DD', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 }, feedbackText: { color: '#8B531E', fontSize: 12, fontWeight: '700' },
  section: { gap: spacing.sm }, sectionTitle: { color: colors.text, ...typography.sectionTitle }, waysActions: { alignItems: 'flex-end', gap: 3 }, availableCount: { color: colors.textMuted, ...typography.count }, logAction: { justifyContent: 'center', minHeight: controlHeights.compact, paddingLeft: spacing.sm }, logActionText: { color: colors.accent, fontSize: 13, fontWeight: '800' }, activityList: { gap: layout.compactGap }, emptyText: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', paddingVertical: spacing.sm },
  completedHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: controlHeights.standard }, completedCount: { color: colors.textMuted, marginTop: 2, ...typography.count }, chevron: { color: colors.accent, fontSize: 20, fontWeight: '800' }, completedSummary: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.medium, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: cardPadding.secondary }, completedSummaryText: { color: colors.text, fontSize: 13, fontWeight: '700' }, completedSummaryHint: { color: colors.textMuted, ...typography.count },
  completedList: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, paddingHorizontal: cardPadding.secondary }, completedRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 54, paddingVertical: 7 }, completedRowBorder: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, completedCopy: { flex: 1 }, manualTitleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, manualBadge: { color: colors.accent, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 }, completedTitle: { color: colors.text, fontSize: 13, fontWeight: '700' }, completedMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 }, doneButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 14, justifyContent: 'center', minHeight: controlHeights.compact, minWidth: 72, paddingHorizontal: 10 }, doneButtonPressed: { opacity: 0.65, transform: [{ scale: 0.97 }] }, doneButtonText: { color: colors.surface, fontSize: 12, fontWeight: '800' },
  weekCard: { backgroundColor: colors.surfaceMuted, borderRadius: radii.medium, flexDirection: 'row', padding: cardPadding.secondary }, weekStat: { flex: 1 }, weekValue: { color: colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' }, weekLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2, textAlign: 'center' }, divider: { backgroundColor: colors.border, width: 1 }, pressed: { opacity: 0.65 },
});
