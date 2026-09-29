import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { formatTime } from '@/core/time';
import type { Appointment } from '@/features/appointments/domain/appointment';

export const REMINDERS_CHANNEL_ID = 'reminders';
export const DEMO_REMINDER_DELAY_SECONDS = 10;

export type PushStatus = 'granted' | 'denied' | 'unavailable';

export interface PushRegistration {
  status: PushStatus;
  token?: string;
}

/** Foreground presentation and the Android channel used by the reminders. Safe to call repeatedly. */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
    name: 'Appointment reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/**
 * Current permission without prompting. Remote pushes need a physical device (`unavailable` on
 * emulators); local notifications (demo mode) work anywhere.
 */
export async function getPermissionStatus(remote = true): Promise<PushStatus> {
  if (remote && !Device.isDevice) return 'unavailable';
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.granted ? 'granted' : 'denied';
}

/** Asks for permission when it is not granted yet (a previous "deny" makes this a no-op). */
export async function requestPermission(remote = true): Promise<PushStatus> {
  if (remote && !Device.isDevice) return 'unavailable';
  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) permissions = await Notifications.requestPermissionsAsync();
  return permissions.granted ? 'granted' : 'denied';
}

/** Permission + Expo push token. Never throws: any failure to obtain a token is `unavailable`. */
export async function registerForPushAsync(): Promise<PushRegistration> {
  try {
    await configureNotifications(); // the channel must exist before asking on Android 13+
    const status = await requestPermission();
    if (status !== 'granted') return { status };

    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return { status: 'unavailable' };

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { status: 'granted', token: data };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Demo mode: a local notification a few seconds after booking, standing in for the server push. */
export async function scheduleDemoReminder(
  appointment: Pick<Appointment, 'id' | 'start' | 'serviceName' | 'professionalName'>,
  timeZone: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Reminder: ${appointment.serviceName}`,
      body: `${formatTime(appointment.start, timeZone)} with ${appointment.professionalName} (demo)`,
      sound: 'default',
      data: { appointmentId: appointment.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: DEMO_REMINDER_DELAY_SECONDS,
      channelId: REMINDERS_CHANNEL_ID,
    },
  });
}
