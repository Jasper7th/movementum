import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../application/AppStateProvider';
import { CompactStatCard } from '../components/CompactStatCard';
import { getManualActivityCategory } from '../data/manualActivities';
import { getAchievementById } from '../domain/achievements';
import { addLocalMonths, getMonthCalendarGrid, localDateFromKey, monthKeyFromDateKey, toLocalDateKey } from '../domain/calendar';
import { aggregateMonth, getCalendarDaySummary, getDefaultSelectedDate, getHistoryRecords, getMonthHistory, getTrackingStartDate, type CalendarDayStatus, type CalendarDaySummary } from '../domain/history';
import type { ActivityHistoryItem } from '../domain/models';
import { cardPadding, colors, layout, radii, spacing, typography } from '../ui/theme';

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const { state } = useAppState();
  const today = toLocalDateKey();
  const currentMonth = monthKeyFromDateKey(today);
  const trackingStart = state.trackingStartedAt ?? getTrackingStartDate(state.progress, state.daily);
  const firstMonth = monthKeyFromDateKey(trackingStart);
  const [month, setMonth] = useState(currentMonth);
  const days = useMemo(() => getMonthHistory(month, state.progress, state.daily, today), [month, state, today]);
  const records = useMemo(() => new Map(getHistoryRecords(state.progress, state.daily).map((record) => [record.date, record])), [state]);
  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(today);
  const summary = aggregateMonth(days);
  const selectedDay = selectedDate && monthKeyFromDateKey(selectedDate) === month ? dayMap.get(selectedDate) : undefined;

  useEffect(() => {
    setSelectedDate(getDefaultSelectedDate(month, days, today));
  }, [month]); // The day's live record updates without replacing the user's selection.

  const monthGrid = getMonthCalendarGrid(month);
  const monthLabel = localDateFromKey(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const canGoBack = month > firstMonth;
  const canGoForward = month < currentMonth;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityLabel="Back to Progress" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>‹ Progress</Text></Pressable>
        <Text style={styles.eyebrow}>YOUR CONSISTENCY</Text><Text style={styles.title}>History</Text><Text style={styles.subtitle}>The days you show up become something worth looking back on.</Text>

        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <MonthButton disabled={!canGoBack} label="Previous month" symbol="‹" onPress={() => setMonth(addLocalMonths(month, -1))} />
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <MonthButton disabled={!canGoForward} label="Next month" symbol="›" onPress={() => setMonth(addLocalMonths(month, 1))} />
          </View>
          <View style={styles.weekRow}>{weekdays.map((weekday, index) => <Text key={`${weekday}-${index}`} style={styles.weekday}>{weekday}</Text>)}</View>
          <View style={styles.calendarGrid}>
            {monthGrid.map((date, index) => {
              if (!date) return <View key={`blank-${index}`} style={styles.daySlot} />;
              const day = dayMap.get(date) ?? getCalendarDaySummary(date, records.get(date), today, trackingStart);
              return <CalendarDay day={day} key={date} selected={date === selectedDate} onSelect={() => setSelectedDate(date)} />;
            })}
          </View>
          <View style={styles.legend}>
            <Legend color={colors.accent} label="Workout" /><Legend color="#91BE9E" label="Light" /><Legend color="#829088" label="Active" /><Legend color={colors.surfaceMuted} label="Missed" /><View style={styles.legendItem}><View style={styles.perfectDot} /><Text style={styles.legendText}>Perfect</Text></View>
          </View>
        </View>

        <DayDetail day={selectedDay} achievements={state.achievements.filter((unlock) => toLocalDateKey(new Date(unlock.unlockedAt)) === selectedDate)} />

        <Text style={styles.sectionTitle}>{localDateFromKey(`${month}-01`).toLocaleDateString(undefined, { month: 'long' })} summary</Text>
        <View style={styles.summaryRows}>
          <View style={styles.summaryRow}><CompactStatCard label="Active" value={summary.activeDays} /><CompactStatCard label="Workout" value={summary.workoutDays} /><CompactStatCard label="Light" value={summary.lightDays} /></View>
          <View style={styles.summaryRow}><CompactStatCard label="Perfect" value={summary.perfectDays} /><CompactStatCard label="XP earned" value={summary.totalXp.toLocaleString()} /></View>
        </View>
        {summary.activeDays === 0 && summary.totalXp === 0 && <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{month === currentMonth ? 'Your history starts here.' : 'A quiet month.'}</Text><Text style={styles.emptyText}>{month === currentMonth ? 'Complete activities and your calendar will begin filling up.' : 'There’s no saved activity for this month.'}</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

function MonthButton({ disabled, label, onPress, symbol }: { disabled: boolean; label: string; onPress: () => void; symbol: string }) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.monthButton, disabled && styles.monthButtonDisabled, pressed && !disabled && styles.pressed]}><Text style={styles.monthButtonText}>{symbol}</Text></Pressable>;
}

function CalendarDay({ day, onSelect, selected }: { day: CalendarDaySummary; onSelect: () => void; selected: boolean }) {
  const dayNumber = Number(day.date.slice(-2));
  const formattedDate = localDateFromKey(day.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  const statusLabel = getStatusLabel(day.status);
  const accessibilityLabel = `${formattedDate}, ${statusLabel}${day.isPerfect ? ', Perfect Day' : ''}, ${day.earnedXp} XP${day.status === 'future' ? ', future date' : ''}`;
  return (
    <View style={styles.daySlot}>
      <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole={day.isSelectable ? 'button' : undefined} accessibilityState={{ disabled: !day.isSelectable, selected }} disabled={!day.isSelectable} onPress={onSelect} style={({ pressed }) => [styles.day, dayStyle(day.status), day.isToday && styles.today, selected && styles.selectedDay, pressed && styles.pressed]}>
        <Text style={[styles.dayText, dayTextStyle(day.status)]}>{dayNumber}</Text>
        {day.isPerfect && <View style={styles.perfectDot} />}
      </Pressable>
    </View>
  );
}

function DayDetail({ achievements, day }: { achievements: Array<{ id: Parameters<typeof getAchievementById>[0] }>; day?: CalendarDaySummary }) {
  if (!day) return <View style={styles.detailCard}><Text style={styles.detailEmpty}>Select a saved day to see what happened.</Text></View>;
  const record = day.record;
  const title = localDateFromKey(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const missingOlderDetail = Boolean(record && record.earnedXp > 0 && record.activities.length === 0);
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailDate}>{title}</Text>
      <View style={styles.detailStatusRow}><Text style={styles.detailStatus}>{getStatusLabel(day.status)}</Text><Text style={styles.detailXp}>{day.earnedXp} XP</Text>{day.isPerfect && <Text style={styles.perfectPill}>PERFECT</Text>}</View>
      {day.status === 'active-unclassified' && <Text style={styles.detailNote}>Type unavailable for older data.</Text>}
      {record?.activities.length ? <View style={styles.activityList}>{record.activities.map((activity) => <HistoryActivity activity={activity} key={activity.id} />)}</View> : <Text style={styles.detailNote}>{missingOlderDetail ? "Detailed activities weren’t saved for this older day." : day.status === 'today-unfinished' ? 'Nothing completed yet. Today is still yours.' : 'No activities were logged.'}</Text>}
      {achievements.length > 0 && <View style={styles.earnedSection}><Text style={styles.earnedTitle}>EARNED</Text>{achievements.map((unlock) => <Text key={unlock.id} style={styles.earnedName}>{getAchievementById(unlock.id).name}</Text>)}</View>}
    </View>
  );
}

function HistoryActivity({ activity }: { activity: ActivityHistoryItem }) {
  const category = activity.source === 'manual' && activity.categoryId ? getManualActivityCategory(activity.categoryId).label : undefined;
  return <View style={styles.activityRow}><View style={styles.activityCopy}><Text style={styles.activityTitle}>{activity.title}</Text><Text style={styles.activityMeta}>{activity.durationMinutes} min{category ? ` · ${category}` : ''}</Text></View><Text style={styles.activityXp}>+{activity.xp} XP</Text></View>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

function getStatusLabel(status: CalendarDayStatus): string {
  switch (status) {
    case 'workout': return 'Workout Day';
    case 'light': return 'Light / Recovery Day';
    case 'active-unclassified': return 'Active Day';
    case 'today-unfinished': return 'Today · In progress';
    case 'inactive': return 'Inactive Day';
    case 'future': return 'Future';
    case 'pre-tracking': return 'Before Movementum';
  }
}

function dayStyle(status: CalendarDayStatus) {
  switch (status) {
    case 'workout': return styles.workoutDay;
    case 'light': return styles.lightDay;
    case 'active-unclassified': return styles.unclassifiedDay;
    case 'inactive': return styles.inactiveDay;
    case 'today-unfinished': return styles.unfinishedDay;
    default: return styles.emptyDay;
  }
}

function dayTextStyle(status: CalendarDayStatus) {
  return status === 'workout' || status === 'active-unclassified' ? styles.dayTextOnDark : status === 'future' || status === 'pre-tracking' ? styles.dayTextSubdued : undefined;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 }, content: { gap: 14, paddingBottom: layout.pageBottom, paddingHorizontal: layout.pageHorizontal, paddingTop: layout.pageTop }, back: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingRight: spacing.md }, backText: { color: colors.accent, fontSize: 14, fontWeight: '800' }, eyebrow: { color: colors.accent, ...typography.pageEyebrow }, title: { color: colors.text, ...typography.pageTitle }, subtitle: { color: colors.textMuted, marginBottom: spacing.xs, ...typography.body },
  calendarCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.large, borderWidth: 1, padding: cardPadding.secondary }, monthHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }, monthTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, monthButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 }, monthButtonDisabled: { opacity: 0.25 }, monthButtonText: { color: colors.accent, fontSize: 28, fontWeight: '500' }, weekRow: { flexDirection: 'row', marginBottom: 5 }, weekday: { color: colors.textMuted, flex: 1, fontSize: 10, fontWeight: '800', textAlign: 'center' }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' }, daySlot: { alignItems: 'center', height: 44, justifyContent: 'center', width: '14.2857%' }, day: { alignItems: 'center', borderRadius: 16, height: 38, justifyContent: 'center', width: 38 }, dayText: { color: colors.text, fontSize: 13, fontWeight: '700' }, dayTextOnDark: { color: colors.surface }, dayTextSubdued: { color: '#AAB2AC' }, workoutDay: { backgroundColor: colors.accent }, lightDay: { backgroundColor: '#CDE5D2' }, unclassifiedDay: { backgroundColor: '#829088' }, inactiveDay: { backgroundColor: colors.surfaceMuted }, unfinishedDay: { backgroundColor: colors.surface, borderColor: '#9EB0A4', borderWidth: 1 }, emptyDay: { backgroundColor: 'transparent' }, today: { borderColor: colors.text, borderWidth: 1.5 }, selectedDay: { shadowColor: colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.22, shadowRadius: 2, transform: [{ scale: 1.07 }] }, perfectDot: { backgroundColor: colors.warm, borderRadius: 3, height: 6, width: 6 }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm }, legendItem: { alignItems: 'center', flexDirection: 'row', gap: 4 }, legendSwatch: { borderRadius: 4, height: 8, width: 8 }, legendText: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  detailCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, padding: cardPadding.secondary }, detailDate: { color: colors.text, fontSize: 17, fontWeight: '800' }, detailStatusRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 7 }, detailStatus: { color: colors.accent, fontSize: 13, fontWeight: '800' }, detailXp: { color: colors.text, fontSize: 13, fontWeight: '800' }, perfectPill: { backgroundColor: '#FFF0DF', borderRadius: 8, color: '#A45B13', fontSize: 9, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4 }, detailNote: { color: colors.textMuted, marginTop: 12, ...typography.helper }, detailEmpty: { color: colors.textMuted, paddingVertical: spacing.sm, ...typography.body }, activityList: { marginTop: 12 }, activityRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.sm, paddingVertical: 11 }, activityCopy: { flex: 1 }, activityTitle: { color: colors.text, fontSize: 14, fontWeight: '800' }, activityMeta: { color: colors.textMuted, marginTop: 2, ...typography.helper }, activityXp: { color: colors.accent, fontSize: 12, fontWeight: '800' }, earnedSection: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 12 }, earnedTitle: { color: colors.warm, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, earnedName: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 5 },
  sectionTitle: { color: colors.text, marginTop: spacing.xs, ...typography.sectionTitle }, summaryRows: { gap: spacing.sm }, summaryRow: { flexDirection: 'row', gap: spacing.sm }, emptyCard: { backgroundColor: colors.accentSoft, borderRadius: radii.medium, padding: cardPadding.secondary }, emptyTitle: { color: colors.text, ...typography.cardTitle }, emptyText: { color: colors.textMuted, marginTop: 4, ...typography.helper }, pressed: { opacity: 0.65 },
});
