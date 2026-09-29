import type { Repositories } from '@/core/di';

import { useNotificationsStore } from './notifications-store';

/** Call before signing out: the device stops receiving the previous user's reminders. Best effort. */
export async function unregisterPushToken(repositories: Pick<Repositories, 'pushTokens'>) {
  const { token, clearToken } = useNotificationsStore.getState();
  if (!token) return;
  try {
    await repositories.pushTokens.remove(token);
  } catch {
    // Offline or already signed out: the server drops the token on DeviceNotRegistered.
  }
  clearToken();
}
