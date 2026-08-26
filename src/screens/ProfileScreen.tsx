import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppState } from '../application/AppStateProvider';
import { useAuth } from '../application/AuthProvider';
import { SecondaryActionRow } from '../components/SecondaryActionRow';
import { notificationConfig } from '../config/notifications';
import { isDeveloperUser } from '../config/developerAccess';
import { activityAccessLabels, activityLevelLabels, primaryGoalLabels } from '../domain/preferences';
import { getLevelProgress } from '../domain/levels';
import { getLifetimeStats } from '../domain/lifetime';
import { cardPadding, colors, controlHeights, layout, radii, spacing, typography } from '../ui/theme';
import { OnboardingScreen } from './OnboardingScreen';
import { SocialProfileEditor } from '../components/SocialProfileEditor';
import { buildSocialProgressInput, type SocialProfile } from '../domain/social';
import { socialService } from '../services/socialService';

export function ProfileScreen({ onOpenProgress, onOpenTutorial }: { onOpenProgress: () => void; onOpenTutorial: () => void }) {
  const { user, signOut } = useAuth();
  const { state, resetAllData, updatePreferences, notificationPermission, setNotificationsEnabled, updateNotificationSettings, scheduleTestNotification } = useAppState();
  const [editing, setEditing] = useState(false);
  const [editingSocial, setEditingSocial] = useState(false);
  const [socialProfile, setSocialProfile] = useState<SocialProfile | null>();
  const [socialProfileLoading, setSocialProfileLoading] = useState(true);
  const [socialProfileError, setSocialProfileError] = useState(false);
  const preferences = state.preferences;
  const lifetime = getLifetimeStats(state.progress, state.daily);
  const level = getLevelProgress(lifetime.lifetimeXp);
  const notificationPreferences = state.notificationPreferences;
  const showDevelopment = isDeveloperUser(user?.id);

  useEffect(() => {
    let active = true;
    if (user) void socialService.getMyProfile(user.id).then((result) => { if (active) { if (result.data !== undefined) setSocialProfile(result.data); setSocialProfileError(Boolean(result.error)); setSocialProfileLoading(false); } });
    return () => { active = false; };
  }, [user]);

  if (!preferences) return null;

  if (editing) {
    return <OnboardingScreen initialPreferences={preferences} onCancel={() => setEditing(false)} onSave={(updated) => { updatePreferences(updated); setEditing(false); }} />;
  }
  if (editingSocial) return <SocialProfileEditor initialProfile={socialProfile} onCancel={() => setEditingSocial(false)} onSaved={(profile) => { setSocialProfile(profile); setEditingSocial(false); if (user) void socialService.upsertProgress(user.id, buildSocialProgressInput(state)); }} />;

  const confirmReset = () => Alert.alert(
    'Reset Movementum data?',
    'This clears onboarding, preferences, today’s activity, and progress history on this device.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset data', style: 'destructive', onPress: () => { void resetAllData(); } }],
  );

  const confirmLogout = () => Alert.alert(
    'Log out of Movementum?',
    'Your Movementum history stays safely on this device for this account.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: () => { void signOut().then((result) => { if (!result.ok) Alert.alert('Could not log out', result.error); }); } }],
  );

  const handleMasterToggle = async (enabled: boolean) => {
    const status = await setNotificationsEnabled(enabled);
    if (enabled && status !== 'granted') {
      Alert.alert('Notifications unavailable', status === 'denied' ? 'Notifications are disabled in iOS Settings.' : 'Movementum could not access notifications on this device.');
    }
  };

  const handleTestNotification = async () => {
    const scheduled = await scheduleTestNotification();
    Alert.alert(scheduled ? 'Test scheduled' : 'Test unavailable', scheduled ? `Background Movementum now. The local test will arrive in about ${notificationConfig.testDelaySeconds} seconds.` : 'Enable Movementum reminders and allow notifications first.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR SETTINGS</Text><Text style={styles.title}>Profile</Text><Text style={styles.subtitle}>The starting point Movementum uses to understand your week.</Text>
      <View style={styles.settingsSection}><Text style={styles.sectionTitle}>Account</Text><View style={styles.card}><ProfileRow label="Email" value={user?.email ?? 'Signed in'} last /></View></View>
      <View style={styles.settingsSection}><Text style={styles.sectionTitle}>Social</Text><View style={styles.card}>{socialProfileLoading ? <ProfileRow label="Social profile" value="Loading…" last /> : socialProfileError ? <ProfileRow label="Social profile" value="Unavailable offline" last /> : socialProfile ? <><ProfileRow label="Display name" value={socialProfile.displayName} /><ProfileRow label="Username" value={`@${socialProfile.username}`} last /><SecondaryActionRow label="Edit social profile" onPress={() => setEditingSocial(true)} /></> : <SecondaryActionRow label="Set up your social profile" onPress={() => setEditingSocial(true)} />}</View></View>
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Your plan</Text>
        <Pressable accessibilityHint="Opens detailed progress" accessibilityRole="button" onPress={onOpenProgress} style={({ pressed }) => [styles.progressSummary, pressed && styles.pressed]}><Text style={styles.progressLevel}>Level {level.level}</Text><View style={styles.progressRight}><Text style={styles.progressXp}>{level.lifetimeXp.toLocaleString()} lifetime XP</Text><Text style={styles.progressChevron}>›</Text></View></Pressable>
        <View style={styles.card}>
          <ProfileRow label="Primary goal" value={primaryGoalLabels[preferences.primaryGoal]} />
          <ProfileRow label="Planned workouts" value={formatDaysPerWeek(preferences.workoutDaysPerWeek)} />
          <ProfileRow label="Light / recovery" value={formatDaysPerWeek(preferences.activeRecoveryDaysPerWeek)} />
          <ProfileRow label="Ways to move" value={preferences.activityAccess.map((item) => activityAccessLabels[item]).join(', ')} />
          <ProfileRow label="Starting level" value={activityLevelLabels[preferences.startingActivityLevel]} last />
          <SecondaryActionRow label="Edit goals & preferences" onPress={() => setEditing(true)} />
          <SecondaryActionRow label="How Movementum works" onPress={onOpenTutorial} />
        </View>
      </View>
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.notificationCard}>
          <SettingToggle label="Movementum reminders" onValueChange={(value) => { void handleMasterToggle(value); }} value={notificationPreferences.enabled} />
          {notificationPreferences.enabled && <>
            <View style={styles.settingDivider} />
            <SettingToggle label="Daily reminder" onValueChange={(dailyReminderEnabled) => updateNotificationSettings({ dailyReminderEnabled })} value={notificationPreferences.dailyReminderEnabled} />
            {notificationPreferences.dailyReminderEnabled && <View style={styles.timeArea}><Text style={styles.timeLabel}>Reminder time</Text><View style={styles.timeOptions}>{notificationConfig.reminderHourOptions.map((hour) => <Pressable accessibilityRole="button" accessibilityState={{ selected: notificationPreferences.reminderHour === hour }} key={hour} onPress={() => updateNotificationSettings({ reminderHour: hour })} style={({ pressed }) => [styles.timeOption, notificationPreferences.reminderHour === hour && styles.timeOptionSelected, pressed && styles.pressed]}><Text style={[styles.timeOptionText, notificationPreferences.reminderHour === hour && styles.timeOptionTextSelected]}>{formatHour(hour)}</Text></Pressable>)}</View></View>}
            <View style={styles.settingDivider} />
            <SettingToggle label="Streak reminder" onValueChange={(streakReminderEnabled) => updateNotificationSettings({ streakReminderEnabled })} value={notificationPreferences.streakReminderEnabled} />
            <View style={styles.settingDivider} />
            <SettingToggle label="Weekly plan reminder" onValueChange={(weeklyReminderEnabled) => updateNotificationSettings({ weeklyReminderEnabled })} value={notificationPreferences.weeklyReminderEnabled} />
          </>}
        </View>
        {notificationPermission === 'denied' && <Text style={styles.permissionNote}>Notifications are disabled in iOS Settings.</Text>}
        {notificationPermission === 'unavailable' && <Text style={styles.permissionNote}>Notifications are unavailable in this environment.</Text>}
      </View>
      {showDevelopment && <View style={styles.developer}><Text style={styles.developerTitle}>Development</Text><Text style={styles.developerHint}>Test local delivery or clear this device’s prototype data.</Text><View style={styles.developerActions}><Pressable accessibilityRole="button" onPress={() => { void handleTestNotification(); }} style={({ pressed }) => [styles.testButton, pressed && styles.pressed]}><Text style={styles.testText}>Schedule test in 10 seconds</Text></Pressable><Pressable accessibilityRole="button" onPress={confirmReset} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}><Text style={styles.resetText}>Reset local data</Text></Pressable></View></View>}
      <View style={styles.logoutSection}><Pressable accessibilityRole="button" onPress={confirmLogout} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}><Text style={styles.logoutText}>Log out</Text></Pressable></View>
    </ScrollView>
    </SafeAreaView>
  );
}

function SettingToggle({ label, onValueChange, value }: { label: string; onValueChange: (value: boolean) => void; value: boolean }) {
  return <View style={styles.settingRow}><Text style={styles.settingLabel}>{label}</Text><Switch ios_backgroundColor={colors.border} onValueChange={onValueChange} trackColor={{ false: colors.border, true: '#A9D9BA' }} thumbColor={value ? colors.accent : colors.surface} value={value} /></View>;
}

function formatHour(hour: number): string {
  const normalized = hour % 12 || 12;
  return `${normalized}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
}

function formatDaysPerWeek(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'} per week`;
}

function ProfileRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <View style={[styles.row, !last && styles.rowBorder]}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 }, content: { gap: 13, paddingBottom: layout.pageBottom, paddingHorizontal: layout.pageHorizontal, paddingTop: layout.pageTop }, eyebrow: { color: colors.accent, ...typography.pageEyebrow }, title: { color: colors.text, ...typography.pageTitle }, subtitle: { color: colors.textMuted, marginBottom: spacing.xs, ...typography.body },
  progressSummary: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radii.medium, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: cardPadding.secondary }, progressLevel: { color: colors.accent, fontSize: 17, fontWeight: '800' }, progressRight: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, progressXp: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, progressChevron: { color: colors.accent, fontSize: 21 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, overflow: 'hidden' }, row: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, minHeight: 44, paddingHorizontal: cardPadding.secondary, paddingVertical: 10 }, rowBorder: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, rowLabel: { color: colors.textMuted, flex: 0.42, fontSize: 12, fontWeight: '700' }, rowValue: { color: colors.text, flex: 0.58, fontSize: 13, fontWeight: '700', lineHeight: 18, textAlign: 'right' },
  settingsSection: { gap: spacing.sm, marginTop: spacing.xs }, sectionTitle: { color: colors.text, ...typography.sectionTitle }, notificationCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.medium, borderWidth: 1, paddingHorizontal: cardPadding.secondary }, settingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 50 }, settingLabel: { color: colors.text, fontSize: 14, fontWeight: '700' }, settingDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth }, timeArea: { gap: 6, paddingBottom: 12 }, timeLabel: { color: colors.textMuted, ...typography.count }, timeOptions: { flexDirection: 'row', gap: 5 }, timeOption: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.small, flex: 1, justifyContent: 'center', minHeight: controlHeights.compact, paddingHorizontal: 3 }, timeOptionSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 1 }, timeOptionText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' }, timeOptionTextSelected: { color: colors.accent }, permissionNote: { color: '#9B4339', ...typography.helper },
  developer: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm, marginTop: spacing.lg, paddingTop: spacing.md }, developerTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '800' }, developerHint: { color: colors.textMuted, ...typography.helper }, developerActions: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, testButton: { borderColor: colors.border, borderRadius: radii.small, borderWidth: 1, justifyContent: 'center', minHeight: controlHeights.compact, paddingHorizontal: 12 }, testText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, resetButton: { borderColor: '#C9786D', borderRadius: radii.small, borderWidth: 1, justifyContent: 'center', minHeight: controlHeights.compact, paddingHorizontal: 12 }, resetText: { color: '#9B4339', fontSize: 12, fontWeight: '700' }, logoutSection: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.lg, paddingTop: spacing.lg }, logoutButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.small, borderWidth: 1, justifyContent: 'center', minHeight: controlHeights.standard }, logoutText: { color: colors.text, fontSize: 14, fontWeight: '700' }, pressed: { opacity: 0.65 },
});
