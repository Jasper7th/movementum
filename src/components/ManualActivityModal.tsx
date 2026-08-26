import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { manualActivityConfig } from '../config/manualActivities';
import { getManualActivityCategory, getManualCategoryContribution, manualActivityCategories, type ManualActivityCategoryId, type ManualActivityContribution } from '../data/manualActivities';
import { getManualActivityXp, type CreateManualActivityInput } from '../domain/manualActivities';
import { cardPadding, colors, controlHeights, layout, radii, spacing, typography } from '../ui/theme';

interface ManualActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onLog: (activity: Omit<CreateManualActivityInput, 'id' | 'date' | 'createdAt'>) => void;
}

export function ManualActivityModal({ visible, onClose, onLog }: ManualActivityModalProps) {
  const [categoryId, setCategoryId] = useState<ManualActivityCategoryId>();
  const [durationMinutes, setDurationMinutes] = useState<number>();
  const [otherContribution, setOtherContribution] = useState<ManualActivityContribution>();
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!visible) return;
    setCategoryId(undefined); setDurationMinutes(undefined); setOtherContribution(undefined); setLabel('');
  }, [visible]);

  const contribution = categoryId ? getManualCategoryContribution(categoryId, otherContribution) : undefined;
  const xp = useMemo(() => contribution && durationMinutes ? getManualActivityXp(contribution, durationMinutes) : undefined, [contribution, durationMinutes]);
  const canLog = Boolean(categoryId && durationMinutes && contribution);

  const submit = () => {
    if (!categoryId || !durationMinutes || !contribution) return;
    onLog({ categoryId, durationMinutes, label, otherContribution });
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
          <View style={styles.header}><Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}><Text style={styles.cancel}>Cancel</Text></Pressable><Text style={styles.headerTitle}>Log activity</Text><View style={styles.headerSpacer} /></View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.section}><Text style={styles.sectionTitle}>What did you do?</Text><View style={styles.choiceGrid}>{manualActivityCategories.map((category) => {
              const selected = category.id === categoryId;
              return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} key={category.id} onPress={() => { setCategoryId(category.id); if (category.id !== 'other') setOtherContribution(undefined); }} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{category.label}</Text></Pressable>;
            })}</View></View>

            {categoryId === 'other' && <View style={styles.section}><Text style={styles.sectionTitle}>How would you describe it?</Text><View style={styles.contributionRow}><ContributionChoice label="Workout" selected={otherContribution === 'workout'} onPress={() => setOtherContribution('workout')} /><ContributionChoice label="Light / recovery" selected={otherContribution === 'light'} onPress={() => setOtherContribution('light')} /></View></View>}

            <View style={styles.section}><Text style={styles.sectionTitle}>How long?</Text><View style={styles.durationGrid}>{manualActivityConfig.durationOptions.map((minutes) => {
              const selected = durationMinutes === minutes;
              return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} key={minutes} onPress={() => setDurationMinutes(minutes)} style={({ pressed }) => [styles.duration, selected && styles.durationSelected, pressed && styles.pressed]}><Text style={[styles.durationText, selected && styles.durationTextSelected]}>{minutes === 90 ? '90+' : minutes} min</Text></Pressable>;
            })}</View></View>

            <View style={styles.section}><Text style={styles.sectionTitle}>Add a label <Text style={styles.optional}>(optional)</Text></Text><TextInput accessibilityLabel="Optional activity label" autoCapitalize="sentences" maxLength={40} onChangeText={setLabel} placeholder={categoryId ? `e.g. ${getPlaceholder(categoryId)}` : 'e.g. Basketball, Push, or Hiking'} placeholderTextColor={colors.textMuted} returnKeyType="done" style={styles.input} value={label} /></View>
          </ScrollView>
          <View style={styles.footer}><View><Text style={styles.footerLabel}>{categoryId ? getManualActivityCategory(categoryId).label : 'Choose an activity'}</Text><Text style={styles.footerMeta}>{xp ? `${durationMinutes} min · +${xp} XP` : 'XP is based on activity type and duration'}</Text></View><Pressable accessibilityRole="button" disabled={!canLog} onPress={submit} style={({ pressed }) => [styles.logButton, !canLog && styles.logButtonDisabled, pressed && canLog && styles.pressed]}><Text style={styles.logButtonText}>Log activity</Text></Pressable></View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function ContributionChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.contribution, selected && styles.choiceSelected, pressed && styles.pressed]}><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text></Pressable>;
}

function getPlaceholder(categoryId: ManualActivityCategoryId): string {
  if (categoryId === 'strength') return 'Push, Pull, or Legs';
  if (categoryId === 'sport') return 'Basketball or Pickleball';
  if (categoryId === 'other') return 'Hiking, Swimming, or Yard work';
  return getManualActivityCategory(categoryId).label;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 52, paddingHorizontal: layout.pageHorizontal }, headerAction: { justifyContent: 'center', minHeight: controlHeights.standard, minWidth: 64 }, cancel: { color: colors.accent, fontSize: 14, fontWeight: '700' }, headerTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' }, headerSpacer: { width: 64 },
  content: { gap: layout.sectionGap, paddingBottom: spacing.xl, paddingHorizontal: layout.pageHorizontal, paddingTop: spacing.lg }, section: { gap: spacing.sm }, sectionTitle: { color: colors.text, ...typography.sectionTitle }, optional: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, flexBasis: '47%', flexGrow: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.sm }, choiceSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent }, choiceText: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textAlign: 'center' }, choiceTextSelected: { color: colors.accent, fontWeight: '800' },
  contributionRow: { flexDirection: 'row', gap: spacing.sm }, contribution: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.sm },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, duration: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.small, borderWidth: 1, flexBasis: '29%', flexGrow: 1, justifyContent: 'center', minHeight: controlHeights.standard }, durationSelected: { backgroundColor: colors.accent, borderColor: colors.accent }, durationText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' }, durationTextSelected: { color: colors.surface, fontWeight: '800' },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 48, paddingHorizontal: cardPadding.secondary },
  footer: { alignItems: 'center', backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', paddingHorizontal: layout.pageHorizontal, paddingVertical: 12 }, footerLabel: { color: colors.text, fontSize: 13, fontWeight: '800' }, footerMeta: { color: colors.textMuted, marginTop: 2, ...typography.count }, logButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.medium, justifyContent: 'center', minHeight: 46, paddingHorizontal: spacing.md }, logButtonDisabled: { backgroundColor: '#AAB5AD' }, logButtonText: { color: colors.surface, fontSize: 14, fontWeight: '800' }, pressed: { opacity: 0.68 },
});
