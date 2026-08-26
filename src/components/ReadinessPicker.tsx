import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Readiness } from '../domain/models';
import { colors, controlHeights, radii, spacing } from '../ui/theme';

const options: { id: Readiness; label: string }[] = [
  { id: 'ready', label: 'Ready to go' }, { id: 'normal', label: 'Normal' }, { id: 'low', label: 'Low energy' }, { id: 'recovery', label: 'Recovery' },
];

export function ReadinessPicker({ value, onChange }: { value?: Readiness; onChange: (value?: Readiness) => void }) {
  return <View style={styles.options}>{options.map((option) => {
    const selected = option.id === value;
    return <Pressable accessibilityHint={selected ? 'Clears this optional selection' : 'Updates today’s activity suggestions'} accessibilityRole="radio" accessibilityState={{ selected }} key={option.id} onPress={() => onChange(selected ? undefined : option.id)} style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}>{selected && <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>}<Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text></Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, option: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, flexBasis: '47%', flexDirection: 'row', flexGrow: 1, gap: 6, minHeight: controlHeights.standard, paddingHorizontal: 12, paddingVertical: 8 },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent }, check: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, height: 16, justifyContent: 'center', width: 16 }, checkText: { color: colors.accent, fontSize: 11, fontWeight: '900', lineHeight: 13 }, label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' }, selectedLabel: { color: colors.surface, fontWeight: '800' }, pressed: { opacity: 0.65 },
});
