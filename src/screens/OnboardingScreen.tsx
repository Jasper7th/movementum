import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../application/AppStateProvider';
import type { ActivityAccess, PrimaryGoal, StartingActivityLevel, UserPreferences } from '../domain/models';
import { colors, controlHeights, layout, radii, spacing, typography } from '../ui/theme';

const goalOptions: { id: PrimaryGoal; label: string }[] = [
  { id: 'get-more-active', label: 'Get more active' },
  { id: 'build-muscle', label: 'Build muscle' },
  { id: 'improve-endurance', label: 'Improve endurance' },
  { id: 'feel-healthier', label: 'Feel healthier' },
];

const accessOptions: { id: ActivityAccess; label: string }[] = [
  { id: 'gym', label: 'Gym' },
  { id: 'home-equipment', label: 'Home equipment' },
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'outdoors', label: 'Outdoors' },
];

const levelOptions: { id: StartingActivityLevel; label: string; detail: string }[] = [
  { id: 'not-very-active', label: 'Not very active', detail: 'I’m trying to move more than I do now.' },
  { id: 'somewhat-active', label: 'Somewhat active', detail: 'I’m active a few times most weeks.' },
  { id: 'active', label: 'Active', detail: 'I exercise regularly.' },
  { id: 'very-active', label: 'Very active', detail: 'Training is already a major part of my week.' },
];

type DraftPreferences = Omit<UserPreferences, 'onboardingCompleted'>;

interface OnboardingScreenProps {
  initialPreferences?: UserPreferences;
  onCancel?: () => void;
  onSave?: (preferences: DraftPreferences) => void;
}

export function OnboardingScreen({ initialPreferences, onCancel, onSave }: OnboardingScreenProps = {}) {
  const { completeOnboarding } = useAppState();
  const [step, setStep] = useState(0);
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | undefined>(initialPreferences?.primaryGoal);
  const [workoutDaysPerWeek, setWorkoutDays] = useState(initialPreferences?.workoutDaysPerWeek ?? 3);
  const [activeRecoveryDaysPerWeek, setRecoveryDays] = useState(initialPreferences?.activeRecoveryDaysPerWeek ?? 2);
  const [activityAccess, setActivityAccess] = useState<ActivityAccess[]>(initialPreferences?.activityAccess ?? []);
  const [startingActivityLevel, setStartingActivityLevel] = useState<StartingActivityLevel | undefined>(initialPreferences?.startingActivityLevel);
  const isEditing = Boolean(initialPreferences);

  const canContinue = [
    Boolean(primaryGoal),
    workoutDaysPerWeek + activeRecoveryDaysPerWeek <= 7,
    activityAccess.length > 0,
    Boolean(startingActivityLevel),
  ][step];

  const toggleAccess = (access: ActivityAccess) => {
    setActivityAccess((current) => current.includes(access)
      ? current.filter((item) => item !== access)
      : [...current, access]);
  };

  const finish = () => {
    if (!primaryGoal || !startingActivityLevel || activityAccess.length === 0) return;
    const preferences: DraftPreferences = {
      primaryGoal, workoutDaysPerWeek, activeRecoveryDaysPerWeek, activityAccess, startingActivityLevel,
    };
    if (onSave) onSave(preferences);
    else completeOnboarding(preferences);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" disabled={step === 0 && !isEditing} onPress={() => step === 0 ? onCancel?.() : setStep((current) => current - 1)} style={[styles.back, step === 0 && !isEditing && styles.hidden]}><Text style={styles.backText}>{step === 0 && isEditing ? 'Cancel' : 'Back'}</Text></Pressable>
        <Text style={styles.stepText}>{step + 1} of 4</Text>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((step + 1) / 4) * 100}%` }]} /></View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 0 && <>
          <Text style={styles.eyebrow}>LET’S GET STARTED</Text><Text style={styles.title}>What are you working toward?</Text><Text style={styles.subtitle}>Choose the direction that matters most right now.</Text>
          <View style={styles.options}>{goalOptions.map((option) => <ChoiceCard key={option.id} label={option.label} selected={primaryGoal === option.id} onPress={() => setPrimaryGoal(option.id)} />)}</View>
        </>}

        {step === 1 && <>
          <Text style={styles.eyebrow}>YOUR RHYTHM</Text><Text style={styles.title}>What does a good week look like for you?</Text><Text style={styles.subtitle}>Lighter days count. Walking, mobility, stretching, and easy movement all help build momentum.</Text>
          <DayPicker label="Workout / training days" value={workoutDaysPerWeek} otherValue={activeRecoveryDaysPerWeek} onChange={setWorkoutDays} />
          <DayPicker label="Light active / recovery days" value={activeRecoveryDaysPerWeek} otherValue={workoutDaysPerWeek} onChange={setRecoveryDays} />
          <Text style={styles.weekTotal}>{workoutDaysPerWeek + activeRecoveryDaysPerWeek} of 7 days planned</Text>
        </>}

        {step === 2 && <>
          <Text style={styles.eyebrow}>WHAT WORKS FOR YOU</Text><Text style={styles.title}>How do you like to move?</Text><Text style={styles.subtitle}>Choose all that apply. You can change these later.</Text>
          <View style={styles.options}>{accessOptions.map((option) => <ChoiceCard key={option.id} label={option.label} multiple selected={activityAccess.includes(option.id)} onPress={() => toggleAccess(option.id)} />)}</View>
        </>}

        {step === 3 && <>
          <Text style={styles.eyebrow}>YOUR STARTING POINT</Text><Text style={styles.title}>Where are you starting from?</Text><Text style={styles.subtitle}>There’s no wrong answer. This just gives Movementum context.</Text>
          <View style={styles.options}>{levelOptions.map((option) => <ChoiceCard detail={option.detail} key={option.id} label={option.label} selected={startingActivityLevel === option.id} onPress={() => setStartingActivityLevel(option.id)} />)}</View>
        </>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" disabled={!canContinue} onPress={step === 3 ? finish : () => setStep((current) => current + 1)} style={({ pressed }) => [styles.continueButton, !canContinue && styles.continueDisabled, pressed && canContinue && styles.pressed]}>
          <Text style={styles.continueText}>{step === 3 ? (isEditing ? 'Save changes' : 'Start Movementum') : 'Continue'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ChoiceCard({ label, detail, multiple = false, selected, onPress }: { label: string; detail?: string; multiple?: boolean; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityState={multiple ? { checked: selected } : { selected }} onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}>
      <View style={styles.choiceCopy}><Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text>{detail && <Text style={[styles.choiceDetail, selected && styles.choiceDetailSelected]}>{detail}</Text>}</View>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <Text style={styles.check}>✓</Text>}</View>
    </Pressable>
  );
}

function DayPicker({ label, value, otherValue, onChange }: { label: string; value: number; otherValue: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.daySection}><Text style={styles.dayLabel}>{label}</Text><View style={styles.dayOptions}>{Array.from({ length: 8 }, (_, valueOption) => {
      const disabled = valueOption + otherValue > 7;
      const selected = valueOption === value;
      return <Pressable accessibilityLabel={`${valueOption} ${valueOption === 1 ? 'day' : 'days'}`} accessibilityRole="radio" accessibilityState={{ disabled, selected }} disabled={disabled} key={valueOption} onPress={() => onChange(valueOption)} style={[styles.dayOption, selected && styles.dayOptionSelected, disabled && styles.dayOptionDisabled]}><Text style={[styles.dayOptionText, selected && styles.dayOptionTextSelected]}>{valueOption}</Text></Pressable>;
    })}</View></View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: controlHeights.standard, paddingHorizontal: layout.pageHorizontal }, back: { minWidth: 48, paddingVertical: spacing.sm }, hidden: { opacity: 0 }, backText: { color: colors.accent, fontSize: 14, fontWeight: '700' }, stepText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  progressTrack: { backgroundColor: colors.border, height: 4, marginHorizontal: layout.pageHorizontal, marginTop: spacing.xs, overflow: 'hidden' }, progressFill: { backgroundColor: colors.accent, height: '100%' },
  content: { gap: spacing.md, paddingBottom: spacing.xl, paddingHorizontal: layout.pageHorizontal, paddingTop: spacing.md }, eyebrow: { color: colors.accent, marginTop: spacing.sm, ...typography.pageEyebrow }, title: { color: colors.text, lineHeight: 36, ...typography.pageTitle }, subtitle: { color: colors.textMuted, marginBottom: spacing.sm, ...typography.body }, options: { gap: 9 },
  choice: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, flexDirection: 'row', minHeight: 60, padding: 14 }, choiceSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 2 }, choiceCopy: { flex: 1 }, choiceLabel: { color: colors.text, fontSize: 16, fontWeight: '700' }, choiceLabelSelected: { color: colors.accent }, choiceDetail: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 3 }, choiceDetailSelected: { color: '#3E6852' }, radio: { alignItems: 'center', borderColor: colors.border, borderRadius: 12, borderWidth: 2, height: 24, justifyContent: 'center', marginLeft: spacing.md, width: 24 }, radioSelected: { backgroundColor: colors.accent, borderColor: colors.accent }, check: { color: colors.surface, fontSize: 13, fontWeight: '900' },
  daySection: { gap: spacing.sm, marginTop: spacing.sm }, dayLabel: { color: colors.text, fontSize: 16, fontWeight: '700' }, dayOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, dayOption: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexBasis: '22%', flexGrow: 1, minHeight: controlHeights.standard, justifyContent: 'center' }, dayOptionSelected: { backgroundColor: colors.accent, borderColor: colors.accent }, dayOptionDisabled: { opacity: 0.28 }, dayOptionText: { color: colors.text, fontSize: 14, fontWeight: '700' }, dayOptionTextSelected: { color: colors.surface }, weekTotal: { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' },
  footer: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: spacing.sm, paddingHorizontal: layout.pageHorizontal, paddingTop: spacing.md }, continueButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.medium, justifyContent: 'center', minHeight: controlHeights.primary }, continueDisabled: { backgroundColor: '#AAB5AD' }, continueText: { color: colors.surface, fontSize: 16, fontWeight: '800' }, pressed: { opacity: 0.72 },
});
