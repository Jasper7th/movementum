export type AppTab = 'today' | 'progress' | 'friends' | 'profile';

export const appTabs = [
  { id: 'today', label: 'Today', icon: 'home-outline', activeIcon: 'home' },
  { id: 'progress', label: 'Progress', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  { id: 'friends', label: 'Friends', icon: 'people-outline', activeIcon: 'people' },
  { id: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
] as const satisfies ReadonlyArray<{ id: AppTab; label: string; icon: string; activeIcon: string }>;
