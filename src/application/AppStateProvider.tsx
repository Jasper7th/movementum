import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState as NativeAppState } from 'react-native';
import type { ActivityId } from '../data/activities';
import { toLocalDateKey } from '../domain/calendar';
import type { AchievementUnlock, PersistedAppState, Readiness, UserPreferences } from '../domain/models';
import { applyAchievementEvaluation } from '../domain/achievements';
import { getLifetimeStats } from '../domain/lifetime';
import { getLevelFromLifetimeXp, getLevelsCrossed } from '../domain/levels';
import { createManualActivity, type CreateManualActivityInput } from '../domain/manualActivities';
import { appStorage } from '../storage/appStorage';
import { notificationService, type MomentumPermissionStatus } from '../services/notificationService';
import { awardActivity, completeIntroTutorial, createInitialAppState, finishOnboarding, logManualActivity, removeManualActivity, replacePreferences, rolloverToDate, setDailyReadiness, unawardActivity, updateNotificationPreferences } from './appState';

interface AppStateContextValue {
  state: PersistedAppState;
  completeOnboarding: (preferences: Omit<UserPreferences, 'onboardingCompleted'>) => void;
  updatePreferences: (preferences: Omit<UserPreferences, 'onboardingCompleted'>) => void;
  completeIntroTutorial: () => void;
  setReadiness: (readiness?: Readiness) => void;
  completeActivity: (activityId: ActivityId) => void;
  uncompleteActivity: (activityId: ActivityId) => void;
  logActivity: (activity: Omit<CreateManualActivityInput, 'id' | 'date' | 'createdAt'>) => void;
  removeLoggedActivity: (activityId: string) => void;
  resetAllData: () => Promise<void>;
  levelUpLevel?: number;
  clearLevelUp: () => void;
  achievementUnlocks: AchievementUnlock[];
  clearAchievementUnlocks: () => void;
  notificationPermission: MomentumPermissionStatus;
  setNotificationsEnabled: (enabled: boolean) => Promise<MomentumPermissionStatus>;
  updateNotificationSettings: (patch: Partial<PersistedAppState['notificationPreferences']>) => void;
  scheduleTestNotification: () => Promise<boolean>;
  notificationOpenCount: number;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children, loading, userId }: { children: ReactNode; loading: ReactNode; userId: string }) {
  const [state, setState] = useState<PersistedAppState>();
  const [levelUpLevel, setLevelUpLevel] = useState<number>();
  const [achievementUnlocks, setAchievementUnlocks] = useState<AchievementUnlock[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<MomentumPermissionStatus>('undetermined');
  const [notificationOpenCount, setNotificationOpenCount] = useState(0);
  const saveQueue = useRef(Promise.resolve());
  const previousLevel = useRef<number | undefined>(undefined);
  const announcedLevels = useRef(new Set<number>());
  const knownAchievementIds = useRef<Set<string> | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void (async () => {
      let loaded: PersistedAppState | null = null;
      try {
        loaded = await appStorage.loadForUser(userId, () => createInitialAppState(toLocalDateKey(), userId));
      } catch {
        // Storage being temporarily unavailable should not strand the app on hydration.
      }
      const rolled = rolloverToDate(loaded ?? createInitialAppState(toLocalDateKey(), userId), toLocalDateKey());
      const hydrated = applyAchievementEvaluation(rolled).state;
      if (!active) return;
      setState(hydrated);
      try {
        await appStorage.save(hydrated);
      } catch {
        // The in-memory prototype remains usable; the next mutation retries persistence.
      }
    })();
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    const response = notificationService.addResponseListener(() => setNotificationOpenCount((count) => count + 1));
    const appState = NativeAppState.addEventListener('change', (nextStatus) => {
      if (nextStatus === 'active') update((current) => rolloverToDate(current, toLocalDateKey()));
    });
    return () => { response.remove(); appState.remove(); };
  }, []);

  useEffect(() => {
    if (!state) return;
    let active = true;
    void notificationService.enqueueReconcile(state).then((status) => { if (active) setNotificationPermission(status); });
    return () => { active = false; };
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const level = getLevelFromLifetimeXp(getLifetimeStats(state.progress, state.daily).lifetimeXp);
    if (previousLevel.current === undefined) {
      previousLevel.current = level;
      return;
    }
    if (level > previousLevel.current) {
      const newlyReached = getLevelsCrossed(previousLevel.current, level);
      if (newlyReached.some((reachedLevel) => !announcedLevels.current.has(reachedLevel))) {
        newlyReached.forEach((reachedLevel) => announcedLevels.current.add(reachedLevel));
        setLevelUpLevel(level);
      }
    }
    previousLevel.current = level;
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const currentIds = new Set(state.achievements.map((unlock) => unlock.id));
    if (knownAchievementIds.current === undefined) {
      knownAchievementIds.current = currentIds;
      return;
    }
    const newlyUnlocked = state.achievements.filter((unlock) => !knownAchievementIds.current!.has(unlock.id));
    knownAchievementIds.current = currentIds;
    if (newlyUnlocked.length > 0) setAchievementUnlocks(newlyUnlocked);
  }, [state]);

  const update = (recipe: (current: PersistedAppState) => PersistedAppState) => {
    setState((current) => {
      if (!current) return current;
      const evaluated = applyAchievementEvaluation(recipe(current));
      const next = evaluated.state;
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(() => appStorage.save(next))
        .catch(() => undefined);
      return next;
    });
  };

  if (!state) return <>{loading}</>;

  const value: AppStateContextValue = {
    state,
    completeOnboarding: (preferences) => update((current) => finishOnboarding(current, preferences, toLocalDateKey())),
    updatePreferences: (preferences) => update((current) => replacePreferences(current, preferences)),
    completeIntroTutorial: () => update((current) => completeIntroTutorial(current)),
    setReadiness: (readiness) => update((current) => setDailyReadiness(current, readiness, toLocalDateKey())),
    completeActivity: (activityId) => update((current) => awardActivity(current, activityId, toLocalDateKey())),
    uncompleteActivity: (activityId) => update((current) => unawardActivity(current, activityId, toLocalDateKey())),
    logActivity: (input) => {
      const now = new Date();
      const activity = createManualActivity({
        ...input,
        id: `manual-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        date: toLocalDateKey(now),
        createdAt: now.toISOString(),
      });
      update((current) => logManualActivity(current, activity, toLocalDateKey(now)));
    },
    removeLoggedActivity: (activityId) => update((current) => removeManualActivity(current, activityId, toLocalDateKey())),
    levelUpLevel,
    clearLevelUp: () => setLevelUpLevel(undefined),
    achievementUnlocks,
    clearAchievementUnlocks: () => setAchievementUnlocks([]),
    notificationPermission,
    setNotificationsEnabled: async (enabled) => {
      if (!enabled) {
        update((current) => updateNotificationPreferences(current, { enabled: false }));
        await notificationService.cancelAllMomentumNotifications();
        return notificationPermission;
      }
      const status = await notificationService.requestPermission();
      setNotificationPermission(status);
      update((current) => updateNotificationPreferences(current, { enabled: status === 'granted' }));
      return status;
    },
    updateNotificationSettings: (patch) => update((current) => updateNotificationPreferences(current, patch)),
    scheduleTestNotification: () => state.notificationPreferences.enabled ? notificationService.scheduleTestNotification() : Promise.resolve(false),
    notificationOpenCount,
    resetAllData: async () => {
      await saveQueue.current;
      await appStorage.clearForUser(userId);
      await notificationService.cancelAllMomentumNotifications();
      previousLevel.current = 1;
      announcedLevels.current.clear();
      knownAchievementIds.current = new Set();
      setLevelUpLevel(undefined);
      setAchievementUnlocks([]);
      setState(createInitialAppState(toLocalDateKey(), userId));
    },
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}
