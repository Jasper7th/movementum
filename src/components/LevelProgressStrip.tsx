import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LevelProgress } from '../domain/levels';
import { colors, radii, spacing } from '../ui/theme';

interface LevelProgressStripProps {
  progress: LevelProgress;
  onPress?: () => void;
}

export function LevelProgressStrip({ progress, onPress }: LevelProgressStripProps) {
  const nextLevel = progress.level + 1;
  const progressWidth = `${Math.round(progress.progress * 100)}%` as `${number}%`;

  return (
    <Pressable
      accessibilityHint={onPress ? 'Opens detailed long-term progress' : undefined}
      accessibilityLabel={`Level ${progress.level}. ${progress.xpRemaining} XP to Level ${nextLevel}.`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && onPress && styles.pressed]}
    >
      <View style={styles.copyRow}>
        <Text style={styles.level}>Level {progress.level}</Text>
        <Text style={styles.remaining}>{progress.xpRemaining} XP to Level {nextLevel}</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress.progress * 100) }} style={styles.track}>
        <View style={[styles.fill, { width: progressWidth }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.accentSoft,
    borderColor: '#C7E0D0',
    borderRadius: radii.medium,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  copyRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  level: { color: colors.text, fontSize: 15, fontWeight: '800' },
  remaining: { color: colors.accent, flexShrink: 1, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  track: { backgroundColor: '#C7E0D0', borderRadius: 4, height: 6, overflow: 'hidden' },
  fill: { backgroundColor: colors.accent, borderRadius: 4, height: '100%' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
