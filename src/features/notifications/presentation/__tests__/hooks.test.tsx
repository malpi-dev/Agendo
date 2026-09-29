import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import { renderHookWithProviders } from '@/test/render-with-providers';
import { MockPushTokenRepository } from '../../data/mock-push-token-repository';
import { useNotificationObserver } from '../hooks/use-notification-observer';
import { usePushRegistration } from '../hooks/use-push-registration';
import * as service from '../notifications-service';
import { useNotificationsStore } from '../notifications-store';
import { unregisterPushToken } from '../unregister-push-token';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const mocked = jest.mocked(Notifications);

beforeEach(() => {
  jest.clearAllMocks();
  useNotificationsStore.setState({ permission: 'unknown', token: undefined });
  useSessionStore.setState({ mode: 'supabase' });
});

describe('usePushRegistration', () => {
  it('registers the token once per user and stores the state', async () => {
    jest
      .spyOn(service, 'registerForPushAsync')
      .mockResolvedValue({ status: 'granted', token: 'ExponentPushToken[t]' });
    const pushTokens = new MockPushTokenRepository();
    const register = jest.spyOn(pushTokens, 'register');

    const { rerender } = await renderHookWithProviders(
      (props: { userId: string }) => usePushRegistration(props.userId),
      { repositories: { pushTokens }, initialProps: { userId: 'u1' } },
    );
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    await rerender({ userId: 'u1' });
    expect(register).toHaveBeenCalledTimes(1);
    expect(useNotificationsStore.getState()).toMatchObject({
      permission: 'granted',
      token: 'ExponentPushToken[t]',
    });
  });

  it('does nothing in demo mode', async () => {
    const spy = jest.spyOn(service, 'registerForPushAsync');
    useSessionStore.setState({ mode: 'demo' });
    await renderHookWithProviders(() => usePushRegistration('u1'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('does nothing without a user', async () => {
    const spy = jest.spyOn(service, 'registerForPushAsync');
    await renderHookWithProviders(() => usePushRegistration(undefined));
    expect(spy).not.toHaveBeenCalled();
  });

  it('records denied without registering and never throws when saving fails', async () => {
    const spy = jest.spyOn(service, 'registerForPushAsync');
    spy.mockResolvedValueOnce({ status: 'denied' });
    const pushTokens = new MockPushTokenRepository();
    const register = jest.spyOn(pushTokens, 'register').mockRejectedValue(new Error('offline'));
    await renderHookWithProviders(() => usePushRegistration('u1'), {
      repositories: { pushTokens },
    });
    await waitFor(() => expect(useNotificationsStore.getState().permission).toBe('denied'));
    expect(register).not.toHaveBeenCalled();

    spy.mockResolvedValueOnce({ status: 'granted', token: 't2' });
    await renderHookWithProviders(() => usePushRegistration('u2'), {
      repositories: { pushTokens },
    });
    await waitFor(() => expect(register).toHaveBeenCalledWith('t2', expect.any(String)));
  });
});

describe('unregisterPushToken', () => {
  it('removes the stored token and clears it, even if the request fails', async () => {
    const pushTokens = new MockPushTokenRepository();
    await pushTokens.register('t1', 'android');
    useNotificationsStore.setState({ token: 't1' });
    await unregisterPushToken({ pushTokens });
    expect(pushTokens.tokens.size).toBe(0);
    expect(useNotificationsStore.getState().token).toBeUndefined();

    useNotificationsStore.setState({ token: 't2' });
    jest.spyOn(pushTokens, 'remove').mockRejectedValue(new Error('offline'));
    await expect(unregisterPushToken({ pushTokens })).resolves.toBeUndefined();
    expect(useNotificationsStore.getState().token).toBeUndefined();
  });
});

describe('useNotificationObserver', () => {
  const response = (id: string, data: Record<string, unknown> = { appointmentId: 'a1' }) =>
    ({
      notification: { request: { identifier: id, content: { data } } },
    }) as unknown as Notifications.NotificationResponse;

  it('opens the detail for a tap received while running', async () => {
    let listener: (r: Notifications.NotificationResponse) => void = () => undefined;
    mocked.addNotificationResponseReceivedListener.mockImplementation(((l: typeof listener) => {
      listener = l;
      return { remove: jest.fn() };
    }) as never);
    await renderHook(() => useNotificationObserver(true));

    listener(response('n1'));
    listener(response('n1')); // duplicate delivery of the same notification
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/appointments/[id]',
      params: { id: 'a1' },
    });
  });

  it('cold start: waits until the app is enabled, then navigates once', async () => {
    mocked.getLastNotificationResponse.mockReturnValue(response('n2', { appointmentId: 'a9' }));
    const { rerender } = await renderHook(
      (p: { enabled: boolean }) => useNotificationObserver(p.enabled),
      {
        initialProps: { enabled: false },
      },
    );
    expect(router.push).not.toHaveBeenCalled();
    await rerender({ enabled: true });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/appointments/[id]',
      params: { id: 'a9' },
    });
    await rerender({ enabled: true });
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('ignores notifications without an appointment id', async () => {
    mocked.getLastNotificationResponse.mockReturnValue(response('n3', {}));
    await renderHook(() => useNotificationObserver(true));
    expect(router.push).not.toHaveBeenCalled();
  });
});
