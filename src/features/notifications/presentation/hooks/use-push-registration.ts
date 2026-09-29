import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useRepositoriesOrNull } from '@/core/di';
import { useSessionStore } from '@/core/session';

import { useNotificationsStore } from '../notifications-store';
import { registerForPushAsync } from '../notifications-service';

/**
 * Once per session and user (real backend only): asks for permission, gets the Expo push token
 * and stores it. Never blocks the UI; a failure only leaves the state in `denied`/`unavailable`.
 */
export function usePushRegistration(userId: string | undefined): void {
  const repositories = useRepositoriesOrNull();
  const isDemo = useSessionStore((s) => s.mode === 'demo');
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (isDemo || !repositories || !userId || registeredFor.current === userId) return;
    registeredFor.current = userId;
    void (async () => {
      const { status, token } = await registerForPushAsync();
      useNotificationsStore.getState().setRegistration(status, token);
      if (!token) return;
      try {
        await repositories.pushTokens.register(token, Platform.OS === 'ios' ? 'ios' : 'android');
      } catch {
        // Reminders are best effort; the next launch retries.
        registeredFor.current = null;
      }
    })();
  }, [isDemo, repositories, userId]);
}
