import { StyleSheet, Text, View } from 'react-native';
import type { AchievementSummary } from '../domain/achievements';
import { cardPadding, colors, radii, spacing, typography } from '../ui/theme';

export function AchievementCard({ compact = false, summary }: { compact?: boolean; summary: AchievementSummary }) {
  const unlocked = Boolean(summary.unlock);
  const unlockedDate = summary.unlock ? new Date(summary.unlock.unlockedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined;
  return (
    <View style={[styles.card, compact && styles.compactCard, compact && unlocked && styles.compactUnlockedCard, unlocked && styles.unlockedCard]}>
      <View style={styles.heading}>
        <View style={[styles.badge, unlocked && styles.unlockedBadge]}><Text style={[styles.badgeText, unlocked && styles.unlockedBadgeText]}>{unlocked ? '✓' : '○'}</Text></View>
        <View style={styles.copy}>
          <Text style={styles.name}>{summary.definition.name}</Text>
          <Text numberOfLines={compact ? 2 : undefined} style={styles.description}>{summary.definition.description}</Text>
        </View>
      </View>
      {unlocked && unlockedDate
        ? <Text style={styles.unlockedText}>Unlocked {unlockedDate}</Text>
        : summary.progress && <View style={styles.progressArea}><View style={styles.track}><View style={[styles.fill, { width: `${summary.progress.ratio * 100}%` }]} /></View><Text style={styles.progressText}>{summary.progress.label}</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, gap: 9, padding: cardPadding.secondary },
  compactCard: { paddingHorizontal: cardPadding.secondary, paddingVertical: 12 }, compactUnlockedCard: { gap: 6, paddingVertical: 10 }, unlockedCard: { backgroundColor: colors.accentSoft, borderColor: '#C7E0D0' },
  heading: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 }, badge: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  unlockedBadge: { backgroundColor: colors.accent }, badgeText: { color: colors.textMuted, fontSize: 16, fontWeight: '800' }, unlockedBadgeText: { color: colors.surface },
  copy: { flex: 1 }, name: { color: colors.text, ...typography.cardTitle }, description: { color: colors.textMuted, marginTop: 2, ...typography.helper },
  progressArea: { gap: 5 }, track: { backgroundColor: colors.surfaceMuted, borderRadius: 4, height: 5, overflow: 'hidden' }, fill: { backgroundColor: colors.accent, borderRadius: 4, height: '100%' },
  progressText: { color: colors.textMuted, ...typography.count }, unlockedText: { color: colors.accent, ...typography.count },
});
