import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationConfig } from '../config/notifications';
import { canScheduleNotifications, getNotificationPlan, getNotificationReconciliation, type MomentumNotificationType, type NotificationPermissionStatus, type NotificationPlanItem } from '../domain/notificationLogic';
import type { PersistedAppState } from '../domain/models';

export type MomentumPermissionStatus = NotificationPermissionStatus;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

function mapPermissionStatus(status: Notifications.NotificationPermissionsStatus): MomentumPermissionStatus {
  if (Platform.OS === 'ios' && status.ios) {
    switch (status.ios.status) {
      case Notifications.IosAuthorizationStatus.AUTHORIZED:
      case Notifications.IosAuthorizationStatus.PROVISIONAL:
      case Notifications.IosAuthorizationStatus.EPHEMERAL:
        return 'granted';
      case Notifications.IosAuthorizationStatus.DENIED:
        return 'denied';
      default:
        return 'undetermined';
    }
  }
  if (status.status === 'granted') return 'granted';
  if (status.status === 'denied') return 'denied';
  return 'undetermined';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('momentum-reminders', {
    name: 'Movementum reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function getPermissionStatus(): Promise<MomentumPermissionStatus> {
  try {
    return mapPermissionStatus(await Notifications.getPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

async function requestPermission(): Promise<MomentumPermissionStatus> {
  try {
    await ensureAndroidChannel();
    const current = await getPermissionStatus();
    if (current !== 'undetermined') return current;
    return mapPermissionStatus(await Notifications.requestPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

function isMomentumType(value: unknown): value is MomentumNotificationType {
  return value === 'daily' || value === 'streak' || value === 'weekly' || value === 'test';
}

async function getMomentumSchedules() {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  return requests.flatMap((request) => {
    const type = request.content.data?.momentumType;
    return request.content.data?.momentum === true && isMomentumType(type) ? [{ id: request.identifier, type }] : [];
  });
}

async function cancelAllMomentumNotifications(): Promise<void> {
  try {
    const scheduled = await getMomentumSchedules();
    await Promise.all(scheduled.map((item) => Notifications.cancelScheduledNotificationAsync(item.id)));
  } catch {
    // Notification APIs may be unavailable on unsupported devices; app state remains usable.
  }
}

async function cancelNotificationType(type: MomentumNotificationType): Promise<void> {
  try {
    const scheduled = await getMomentumSchedules();
    await Promise.all(scheduled.filter((item) => item.type === type).map((item) => Notifications.cancelScheduledNotificationAsync(item.id)));
  } catch {
    // Treat cancellation as best-effort when the native API is unavailable.
  }
}

async function schedulePlanItem(item: NotificationPlanItem): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { ...item.content, data: { momentum: true, momentumType: item.type }, sound: false },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: item.triggerDate,
      channelId: Platform.OS === 'android' ? 'momentum-reminders' : undefined,
    },
  });
}

async function reconcile(state: PersistedAppState, now = new Date()): Promise<MomentumPermissionStatus> {
  const permission = await getPermissionStatus();
  let existing = [] as Awaited<ReturnType<typeof getMomentumSchedules>>;
  try { existing = await getMomentumSchedules(); } catch { /* Native scheduling unavailable. */ }
  const desired = canScheduleNotifications(state.notificationPreferences.enabled, permission) ? getNotificationPlan(state, now) : [];
  const actions = getNotificationReconciliation(existing, desired);
  await Promise.all(actions.cancelIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  if (desired.length > 0) {
    try {
      await ensureAndroidChannel();
      for (const item of actions.schedule) await schedulePlanItem(item);
    } catch {
      return permission === 'granted' ? 'unavailable' : permission;
    }
  }
  return permission;
}

let reconcileQueue = Promise.resolve<MomentumPermissionStatus>('undetermined');

function enqueueReconcile(state: PersistedAppState): Promise<MomentumPermissionStatus> {
  reconcileQueue = reconcileQueue.catch(() => 'unavailable').then(() => reconcile(state));
  return reconcileQueue;
}

async function scheduleTestNotification(): Promise<boolean> {
  if (await getPermissionStatus() !== 'granted') return false;
  try {
    await cancelNotificationType('test');
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Movementum notifications are ready', body: 'This is a local test reminder.', data: { momentum: true, momentumType: 'test' }, sound: false },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: notificationConfig.testDelaySeconds },
    });
    return true;
  } catch {
    return false;
  }
}

function addResponseListener(listener: () => void): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

export const notificationService = {
  getPermissionStatus,
  requestPermission,
  enqueueReconcile,
  cancelNotificationType,
  cancelAllMomentumNotifications,
  scheduleTestNotification,
  addResponseListener,
};
