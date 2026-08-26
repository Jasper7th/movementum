import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../application/AppStateProvider';
import { AchievementCard } from '../components/AchievementCard';
import { achievementCatalog, achievementCategoryLabels } from '../data/achievements';
import { getAchievementSummaries } from '../domain/achievements';
import type { AchievementCategory } from '../domain/models';
import { colors, controlHeights, layout, spacing, typography } from '../ui/theme';

const categories: AchievementCategory[] = ['consistency', 'training', 'balance', 'progress', 'resilience'];

export function AchievementsScreen({ onBack }: { onBack: () => void }) {
  const { state } = useAppState();
  const summaries = getAchievementSummaries(state);
  const unlockedCount = summaries.filter((summary) => summary.unlock).length;
  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>‹ Progress</Text></Pressable>
      <Text style={styles.eyebrow}>YOUR COLLECTION</Text><Text style={styles.title}>Achievements</Text>
      <Text style={styles.subtitle}>{unlockedCount} / {achievementCatalog.length} unlocked · Recognition for the momentum you build.</Text>
      {categories.map((category) => {
        const categorySummaries = summaries.filter((summary) => summary.definition.category === category);
        return <View key={category} style={styles.section}><Text style={styles.sectionTitle}>{achievementCategoryLabels[category]}</Text><View style={styles.list}>{categorySummaries.map((summary) => <AchievementCard key={summary.definition.id} summary={summary} />)}</View></View>;
      })}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 }, content: { gap: 10, paddingBottom: 48, paddingHorizontal: layout.pageHorizontal, paddingTop: spacing.sm }, back: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: controlHeights.standard }, backText: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  eyebrow: { color: colors.accent, ...typography.pageEyebrow }, title: { color: colors.text, ...typography.pageTitle }, subtitle: { color: colors.textMuted, ...typography.body },
  section: { gap: 7, marginTop: 12 }, sectionTitle: { color: colors.text, ...typography.sectionTitle }, list: { gap: 7 }, pressed: { opacity: 0.65 },
});
