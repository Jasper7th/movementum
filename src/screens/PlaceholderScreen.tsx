import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../ui/theme';

export function PlaceholderScreen({ title, message }: { title: string; message: string }) {
  return <View style={styles.container}><Text style={styles.eyebrow}>MOVEMENTUM</Text><Text style={styles.title}>{title}</Text><Text style={styles.message}>{message}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl }, eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 34, fontWeight: '800', marginTop: spacing.sm }, message: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
});
