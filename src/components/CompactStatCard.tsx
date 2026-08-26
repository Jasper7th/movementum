import { StyleSheet, Text, View } from 'react-native';
import { cardPadding, colors, radii, typography } from '../ui/theme';

export function CompactStatCard({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.card}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 72, paddingHorizontal: 8, paddingVertical: cardPadding.secondary },
  value: { color: colors.text, fontSize: 18, fontWeight: '800' }, label: { color: colors.textMuted, marginTop: 3, textAlign: 'center', ...typography.count },
});
