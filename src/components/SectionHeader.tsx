import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../ui/theme';

export function SectionHeader({ title, helper, meta, action }: { title: string; helper?: string; meta?: string; action?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}><Text style={styles.title}>{title}</Text>{helper && <Text style={styles.helper}>{helper}</Text>}</View>
      {action ?? (meta ? <Text style={styles.meta}>{meta}</Text> : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  copy: { flex: 1 }, title: { color: colors.text, ...typography.sectionTitle },
  helper: { color: colors.textMuted, marginTop: 2, ...typography.helper },
  meta: { color: colors.textMuted, ...typography.count },
});
