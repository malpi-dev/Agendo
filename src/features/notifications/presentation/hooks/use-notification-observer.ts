import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

/**
 * Opens the appointment detail when a reminder is tapped (cold start and warm).
 * `enabled` is true once the user can see the app (demo, or signed in with a profile); a tap
 * received earlier waits until then.
 */
export function useNotificationObserver(enabled: boolean): void {
  const enabledRef = useRef(enabled);
  const pending = useRef<string | null>(null);
  const handled = useRef(new Set<string>());

  useEffect(() => {
    enabledRef.current = enabled;
    const id = pending.current;
    if (enabled && id) {
      pending.current = null;
      router.push({ pathname: '/appointments/[id]', params: { id } });
    }
  }, [enabled]);

  useEffect(() => {
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const key = response.notification.request.identifier;
      const id = response.notification.request.content.data?.appointmentId;
      if (typeof id !== 'string' || id === '' || handled.current.has(key)) return;
      handled.current.add(key);
      Notifications.clearLastNotificationResponse();
      if (enabledRef.current) router.push({ pathname: '/appointments/[id]', params: { id } });
      else pending.current = id;
    };

    handle(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    return () => subscription.remove();
  }, []);
}
