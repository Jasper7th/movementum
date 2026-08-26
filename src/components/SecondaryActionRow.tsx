import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, controlHeights, spacing } from '../ui/theme';

export function SecondaryActionRow({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><Text style={styles.label}>{label}</Text><Text accessibilityElementsHidden style={styles.chevron}>›</Text></Pressable>;
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: controlHeights.standard, paddingHorizontal: spacing.md },
  label: { color: colors.accent, fontSize: 14, fontWeight: '800' }, chevron: { color: colors.accent, fontSize: 22, lineHeight: 24 }, pressed: { opacity: 0.65 },
});
