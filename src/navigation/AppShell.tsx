import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { IntroTutorialScreen } from '../screens/IntroTutorialScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { colors, spacing } from '../ui/theme';
import { useAppState } from '../application/AppStateProvider';
import { appTabs, type AppTab } from './tabs';

export function AppShell() {
  const { notificationOpenCount } = useAppState();
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const selectTab = (tab: AppTab) => { setActiveTab(tab); setShowAchievements(false); setShowHistory(false); };
  useEffect(() => { if (notificationOpenCount > 0) selectTab('today'); }, [notificationOpenCount]);
  if (showTutorial) return <IntroTutorialScreen mode="revisit" onComplete={() => setShowTutorial(false)} />;
  return (
    <View style={styles.shell}>
      <View style={styles.content}>
        {activeTab === 'today' && <TodayScreen onOpenProgress={() => selectTab('progress')} />}
        {activeTab === 'progress' && (showAchievements ? <AchievementsScreen onBack={() => setShowAchievements(false)} /> : showHistory ? <HistoryScreen onBack={() => setShowHistory(false)} /> : <ProgressScreen onViewAchievements={() => setShowAchievements(true)} onViewHistory={() => setShowHistory(true)} />)}
        {activeTab === 'friends' && <FriendsScreen />}
        {activeTab === 'profile' && <ProfileScreen onOpenProgress={() => selectTab('progress')} onOpenTutorial={() => setShowTutorial(true)} />}
      </View>
      <View style={styles.tabBar}>
        {appTabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: isActive }} key={tab.id} onPress={() => selectTab(tab.id)} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
              <View style={[styles.tabMarker, isActive && styles.tabMarkerActive]} />
              <Ionicons color={isActive ? colors.accent : colors.textMuted} name={(isActive ? tab.activeIcon : tab.icon) as keyof typeof Ionicons.glyphMap} size={20} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background }, content: { flex: 1 },
  tabBar: { alignItems: 'center', backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 80, paddingBottom: spacing.md, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  tab: { alignItems: 'center', flex: 1, gap: 6 }, tabMarker: { backgroundColor: 'transparent', borderRadius: 2, height: 3, width: 24 },
  tabMarkerActive: { backgroundColor: colors.accent }, tabLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' }, tabLabelActive: { color: colors.text }, pressed: { opacity: 0.65 },
});
