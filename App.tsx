import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { AppStateProvider, useAppState } from './src/application/AppStateProvider';
import { AuthProvider, useAuth } from './src/application/AuthProvider';
import { getAchievementById } from './src/domain/achievements';
import { AppShell } from './src/navigation/AppShell';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AuthFlow, ResetPasswordScreen } from './src/screens/AuthScreens';
import { IntroTutorialScreen } from './src/screens/IntroTutorialScreen';
import { colors } from './src/ui/theme';
import { buildSocialProgressInput } from './src/domain/social';
import { socialService } from './src/services/socialService';

function AppContent() {
  const { state, completeIntroTutorial, levelUpLevel, clearLevelUp, achievementUnlocks, clearAchievementUnlocks } = useAppState();
  const onboardingCompleted = Boolean(state.preferences?.onboardingCompleted);
  return (
    <View style={styles.app}>
      <SocialProgressSync />
      {!onboardingCompleted ? <OnboardingScreen /> : !state.hasCompletedIntroTutorial ? <IntroTutorialScreen mode="first-run" onComplete={completeIntroTutorial} /> : <AppShell />}
      {levelUpLevel && <LevelUpBanner level={levelUpLevel} onDone={clearLevelUp} />}
      {achievementUnlocks.length > 0 && !levelUpLevel && <AchievementBanner names={achievementUnlocks.map((unlock) => getAchievementById(unlock.id).name)} onDone={clearAchievementUnlocks} />}
    </View>
  );
}

function SocialProgressSync() {
  const { state } = useAppState();
  const { user } = useAuth();
  const snapshot = buildSocialProgressInput(state);
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => { void socialService.upsertProgress(user.id, snapshot); }, 900);
    return () => clearTimeout(timer);
  }, [snapshot.currentStreak, snapshot.dailyTarget, snapshot.level, snapshot.snapshotDate, snapshot.todayPerfect, snapshot.todayStatus, snapshot.todayXp, user]);
  return null;
}

function AchievementBanner({ names, onDone }: { names: string[]; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { duration: 180, toValue: 1, useNativeDriver: true }),
      Animated.spring(translateY, { friction: 8, tension: 100, toValue: 0, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [onDone, opacity, translateY]);
  const title = names.length === 1 ? 'Achievement unlocked' : `${names.length} achievements unlocked`;
  return <Animated.View accessibilityLiveRegion="polite" style={[styles.achievementBanner, { opacity, transform: [{ translateY }] }]}><Text style={styles.achievementBannerEyebrow}>{title.toUpperCase()}</Text><Text numberOfLines={2} style={styles.achievementBannerText}>{names.join(' · ')}</Text></Animated.View>;
}

function LevelUpBanner({ level, onDone }: { level: number; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { duration: 180, toValue: 1, useNativeDriver: true }),
      Animated.spring(translateY, { friction: 8, tension: 100, toValue: 0, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [onDone, opacity, translateY]);
  return <Animated.View accessibilityLiveRegion="polite" style={[styles.levelBanner, { opacity, transform: [{ translateY }] }]}><Text style={styles.levelBannerEyebrow}>NEW MILESTONE</Text><Text style={styles.levelBannerText}>Level {level} reached</Text></Animated.View>;
}

function LoadingScreen() {
  return <View style={styles.loading}><Text style={styles.loadingText}>Movementum</Text></View>;
}

export default function App() {
  return <AuthProvider><StatusBar style="dark" /><AuthBoundary /></AuthProvider>;
}

function AuthBoundary() {
  const { hydrated, recoveringPassword, user } = useAuth();
  if (!hydrated) return <LoadingScreen />;
  if (recoveringPassword && user) return <ResetPasswordScreen />;
  if (!user) return <AuthFlow />;
  return (
    <AppStateProvider key={user.id} loading={<LoadingScreen />} userId={user.id}>
      <AppContent />
    </AppStateProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
  loadingText: { color: colors.text, fontSize: 24, fontWeight: '800' },
  levelBanner: { backgroundColor: colors.text, borderRadius: 18, left: 24, paddingHorizontal: 18, paddingVertical: 13, position: 'absolute', right: 24, top: 56 },
  levelBannerEyebrow: { color: '#FFD09B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  levelBannerText: { color: colors.surface, fontSize: 17, fontWeight: '800', marginTop: 2 },
  achievementBanner: { backgroundColor: colors.accent, borderRadius: 18, left: 24, paddingHorizontal: 18, paddingVertical: 13, position: 'absolute', right: 24, top: 56 },
  achievementBannerEyebrow: { color: '#DDF1E5', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  achievementBannerText: { color: colors.surface, fontSize: 15, fontWeight: '800', marginTop: 3 },
});
