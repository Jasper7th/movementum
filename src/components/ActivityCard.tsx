import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DailyActivity } from '../domain/models';
import { cardPadding, colors, radii, spacing } from '../ui/theme';

export function ActivityCard({ activity, onComplete, reason, recommended = false }: { activity: DailyActivity; onComplete: (id: string) => void; reason?: string; recommended?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const previousCompleted = useRef(activity.completed);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    if (activity.completed && !previousCompleted.current) {
      setShowReward(true);
      Animated.sequence([
        Animated.timing(scale, { duration: 90, toValue: 1.015, useNativeDriver: true }),
        Animated.spring(scale, { friction: 7, tension: 120, toValue: 1, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => setShowReward(false), 700);
      previousCompleted.current = true;
      return () => clearTimeout(timer);
    }
    previousCompleted.current = activity.completed;
  }, [activity.completed, scale]);

  const animatePress = (toValue: number) => Animated.timing(scale, { duration: 80, toValue, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: activity.completed, disabled: activity.completed }} disabled={activity.completed} onPress={() => onComplete(activity.id)} onPressIn={() => animatePress(0.985)} onPressOut={() => animatePress(1)} style={[styles.card, activity.completed && styles.completed]}>
        <View style={styles.copy}>{recommended && <Text style={styles.recommended}>RECOMMENDED FOR TODAY</Text>}<Text style={styles.title}>{activity.title}</Text><Text style={styles.detail}>{activity.detail}</Text>{reason && <Text style={styles.reason}>{reason}</Text>}<Text style={styles.meta}>{activity.durationMinutes} min · {activity.category}</Text></View>
        <View style={[styles.xp, activity.completed && styles.xpCompleted]}><Text accessibilityLiveRegion="polite" style={[styles.xpText, activity.completed && styles.xpTextCompleted]}>{showReward ? `+${activity.xp} XP` : activity.completed ? '✓ Done' : `+${activity.xp} XP`}</Text></View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, flexDirection: 'row', gap: 12, padding: cardPadding.secondary }, completed: { backgroundColor: colors.accentSoft, borderColor: '#B9DDC7' },
  copy: { flex: 1 }, recommended: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 }, title: { color: colors.text, fontSize: 16, fontWeight: '700' }, detail: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 3 }, reason: { color: colors.accent, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 6 }, meta: { color: colors.accent, fontSize: 11, fontWeight: '700', marginTop: spacing.sm, textTransform: 'capitalize' },
  xp: { backgroundColor: colors.surfaceMuted, borderRadius: 14, minWidth: 62, paddingHorizontal: 10, paddingVertical: 8 }, xpCompleted: { backgroundColor: colors.accent }, xpText: { color: colors.text, fontSize: 12, fontWeight: '800', textAlign: 'center' }, xpTextCompleted: { color: colors.surface },
});
