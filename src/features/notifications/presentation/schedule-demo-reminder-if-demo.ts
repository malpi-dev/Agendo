import { useSessionStore } from '@/core/session';
import type { Appointment } from '@/features/appointments/domain/appointment';

import { requestPermission, scheduleDemoReminder } from './notifications-service';
import { useNotificationsStore } from './notifications-store';

/** Demo mode only: after booking, asks for permission if needed and schedules the local reminder. */
export async function scheduleDemoReminderIfDemo(
  appointment: Appointment,
  timeZone: string,
): Promise<void> {
  if (useSessionStore.getState().mode !== 'demo') return;
  try {
    const permission = await requestPermission(false);
    useNotificationsStore.getState().setPermission(permission);
    if (permission === 'granted') await scheduleDemoReminder(appointment, timeZone);
  } catch {
    // The reminder is a nicety of the demo; never disturb the booking flow.
  }
}
