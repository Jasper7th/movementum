import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, controlHeights, layout, radii, spacing, typography } from '../ui/theme';

export type IntroTutorialMode = 'first-run' | 'revisit';

const pages = [
  {
    eyebrow: 'SHOW UP YOUR WAY',
    title: 'Every day counts',
    body: 'Hard workout or easy walk — both can keep your momentum going.',
    note: 'A bad day doesn’t have to become a zero day.',
    illustration: 'days' as const,
  },
  {
    eyebrow: 'BUILD TODAY',
    title: 'Build a Perfect Day',
    body: 'Activities earn XP. Meaningful movement makes today Active.',
    note: 'Reach 100 XP for a Perfect Day — a bonus goal, not the minimum for success.',
    illustration: 'xp' as const,
  },
  {
    eyebrow: 'KEEP BUILDING',
    title: 'Level yourself up',
    body: 'Your XP, streaks, levels, and achievements build over time.',
    note: 'Keep showing up and Movementum grows with you.',
    illustration: 'level' as const,
  },
] as const;

export function IntroTutorialScreen({ mode, onComplete }: { mode: IntroTutorialMode; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const page = pages[step];
  const isLast = step === pages.length - 1;
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View accessibilityLabel={`Step ${step + 1} of ${pages.length}`} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: pages.length, now: step + 1 }} style={styles.dots}>
          {pages.map((_, index) => <View key={index} style={[styles.dot, index === step && styles.dotActive]} />)}
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{page.eyebrow}</Text>
          <Text style={styles.title}>{page.title}</Text>
          <Text style={styles.body}>{page.body}</Text>
        </View>
        <TutorialIllustration kind={page.illustration} />
        <Text style={styles.note}>{page.note}</Text>
        <View style={styles.navigation}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: step === 0 }}
            disabled={step === 0}
            onPress={step > 0 ? () => setStep((value) => value - 1) : undefined}
            style={({ pressed }) => [styles.backButton, step === 0 && styles.backButtonDisabled, step > 0 && pressed && styles.pressed]}
          >
            <Text style={[styles.backText, step === 0 && styles.backTextDisabled]}>Back</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => isLast ? onComplete() : setStep((value) => value + 1)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryText}>{isLast ? (mode === 'first-run' ? 'Start Movementum' : 'Done') : 'Continue'}</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TutorialIllustration({ kind }: { kind: typeof pages[number]['illustration'] }) {
  if (kind === 'days') return <View style={styles.demoCard}><View accessible accessibilityLabel="Workout Day. Training session or harder effort." style={styles.dayRow}><View style={[styles.dayIndicator, styles.workoutIndicator]} /><View style={styles.dayCopy}><Text style={styles.dayTitle}>Workout Day</Text><Text style={styles.dayDescription}>Training session or harder effort</Text></View></View><View style={styles.dayDivider} /><View accessible accessibilityLabel="Light or Recovery Day. Walking, mobility, stretching, or easy movement." style={styles.dayRow}><View style={[styles.dayIndicator, styles.lightIndicator]} /><View style={styles.dayCopy}><Text style={styles.dayTitle}>Light / Recovery Day</Text><Text style={styles.dayDescription}>Walking, mobility, stretching, or easy movement</Text></View></View></View>;
  if (kind === 'xp') return <View style={styles.demoCard}><View style={styles.demoRow}><Text style={styles.demoTitle}>Today</Text><Text style={styles.xpValue}>75 / 100 XP</Text></View><View style={styles.track}><View style={styles.xpFill} /></View><View style={styles.activities}><Text style={styles.activityText}>Workout · +55 XP</Text><Text style={styles.activityText}>Walk · +20 XP</Text></View></View>;
  return <View style={styles.demoCard}><View style={styles.demoRow}><Text style={styles.level}>Level 7</Text><Text style={styles.levelRemaining}>180 XP to Level 8</Text></View><View style={styles.track}><View style={styles.levelFill} /></View><View style={styles.statRow}><Text style={styles.stat}>🔥 12 day streak</Text><Text style={styles.stat}>◆ 6 achievements</Text></View></View>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { flexGrow: 1, paddingBottom: 24, paddingHorizontal: layout.pageHorizontal, paddingTop: 20 },
  dots: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 28 }, dot: { backgroundColor: colors.border, borderRadius: 4, height: 7, width: 7 }, dotActive: { backgroundColor: colors.accent, width: 24 },
  copy: { marginTop: spacing.lg }, eyebrow: { color: colors.accent, ...typography.pageEyebrow }, title: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -0.8, lineHeight: 40, marginTop: spacing.sm }, body: { color: colors.textMuted, fontSize: 16, lineHeight: 23, marginTop: 12 },
  demoCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.large, borderWidth: 1, gap: spacing.md, marginVertical: spacing.lg, minHeight: 176, justifyContent: 'center', padding: 22 },
  dayRow: { alignItems: 'center', flexDirection: 'row', gap: 14, minHeight: 54 }, dayIndicator: { borderRadius: 7, height: 14, width: 14 }, workoutIndicator: { backgroundColor: colors.accent }, lightIndicator: { backgroundColor: '#9BCDAE', borderColor: colors.accent, borderWidth: 1 }, dayCopy: { flex: 1, gap: 3 }, dayTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }, dayDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17 }, dayDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 28 },
  demoRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, demoTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, xpValue: { color: colors.warm, fontSize: 17, fontWeight: '900' }, track: { backgroundColor: colors.surfaceMuted, borderRadius: 8, height: 10, overflow: 'hidden' }, xpFill: { backgroundColor: colors.warm, borderRadius: 8, height: '100%', width: '75%' }, levelFill: { backgroundColor: colors.accent, borderRadius: 8, height: '100%', width: '70%' }, activities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, activityText: { backgroundColor: '#FFF1E2', borderRadius: 10, color: '#925A20', fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 7 }, level: { color: colors.accent, fontSize: 22, fontWeight: '900' }, levelRemaining: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, stat: { backgroundColor: colors.accentSoft, borderRadius: 10, color: colors.accent, fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 8 },
  note: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 22, minHeight: 48 }, navigation: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }, backButton: { alignItems: 'center', borderRadius: radii.small, justifyContent: 'center', minHeight: controlHeights.primary, width: 76 }, backButtonDisabled: { backgroundColor: colors.surfaceMuted }, backText: { color: colors.accent, fontSize: 15, fontWeight: '800' }, backTextDisabled: { color: colors.textMuted, opacity: 0.55 }, primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.small, flex: 1, justifyContent: 'center', minHeight: controlHeights.primary }, primaryText: { color: colors.surface, fontSize: 16, fontWeight: '800' }, pressed: { opacity: 0.65 },
});
