import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSessionStore } from '@/core/session';

import { getPermissionStatus } from '../notifications-service';
import { useNotificationsStore } from '../notifications-store';

/** Keeps the store in sync with the system permission (also after returning from system settings). */
export function useReminderPermission() {
  const isDemo = useSessionStore((s) => s.mode === 'demo');
  const permission = useNotificationsStore((s) => s.permission);
  const setPermission = useNotificationsStore((s) => s.setPermission);

  useEffect(() => {
    const refresh = () => {
      getPermissionStatus(!isDemo)
        .then(setPermission)
        .catch(() => setPermission('unavailable'));
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [setPermission, isDemo]);

  return permission;
}
