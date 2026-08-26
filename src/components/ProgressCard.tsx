import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { ActivityDefinition, DailyProgress } from '../domain/models';
import { getDailyProgressMessage, getDailyStatus } from '../domain/progress';
import { progressionConfig } from '../config/progression';
import { cardPadding, colors, radii, spacing } from '../ui/theme';

export function ProgressCard({ progress, availableActivities, currentStreak }: { progress: DailyProgress; availableActivities: ActivityDefinition[]; currentStreak: number }) {
  const status = getDailyStatus(progress);
  const animatedProgress = useRef(new Animated.Value(status.ratio)).current;
  const message = getDailyProgressMessage(progress, progressionConfig.nearGoalXpThreshold, availableActivities);

  useEffect(() => {
    Animated.timing(animatedProgress, { duration: 350, toValue: status.ratio, useNativeDriver: false }).start();
  }, [animatedProgress, status.ratio]);

  const width = animatedProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.copy}><Text style={styles.eyebrow}>TODAY'S MOVEMENTUM</Text><Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.amount}>{progress.earnedXp} / {progress.targetXp} XP</Text></View>
        <View style={styles.badge}><Text style={styles.badgeText}>{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</Text></View>
      </View>
      <View style={styles.track}><Animated.View style={[styles.fill, { width }]} /></View>
      <Text accessibilityLiveRegion="polite" style={styles.hint}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.text, borderRadius: radii.large, gap: spacing.md, padding: cardPadding.primary }, row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }, copy: { flex: 1 },
  eyebrow: { color: '#AFC4B5', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, amount: { color: colors.surface, fontSize: 26, fontWeight: '800', marginTop: spacing.xs },
  badge: { backgroundColor: '#2C3A30', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }, badgeText: { color: '#FFD09B', fontSize: 13, fontWeight: '700' },
  track: { backgroundColor: '#344239', borderRadius: 6, height: 11, overflow: 'hidden' }, fill: { backgroundColor: colors.warm, borderRadius: 6, height: '100%' }, hint: { color: '#C5D0C8', fontSize: 13, lineHeight: 19 },
});
