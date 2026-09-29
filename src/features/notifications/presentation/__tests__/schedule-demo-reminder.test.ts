import * as Notifications from 'expo-notifications';

import { useSessionStore } from '@/core/session';

import { scheduleDemoReminderIfDemo } from '../schedule-demo-reminder-if-demo';
import { useNotificationsStore } from '../notifications-store';

const mocked = jest.mocked(Notifications);
const appointment = {
  id: 'a1',
  start: new Date('2026-09-29T16:00:00Z'),
  serviceName: 'Haircut',
  professionalName: 'Marco',
} as never;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
  mocked.requestPermissionsAsync.mockResolvedValue({ granted: false } as never);
  useNotificationsStore.setState({ permission: 'unknown', token: undefined });
});

describe('scheduleDemoReminderIfDemo', () => {
  it('does nothing against the real backend', async () => {
    useSessionStore.setState({ mode: 'supabase' });
    await scheduleDemoReminderIfDemo(appointment, 'America/Mexico_City');
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('in demo mode asks for permission and schedules the local reminder', async () => {
    useSessionStore.setState({ mode: 'demo' });
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
    await scheduleDemoReminderIfDemo(appointment, 'America/Mexico_City');
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(useNotificationsStore.getState().permission).toBe('granted');
  });

  it('does not schedule when permission is denied, and never throws', async () => {
    useSessionStore.setState({ mode: 'demo' });
    await scheduleDemoReminderIfDemo(appointment, 'America/Mexico_City');
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(useNotificationsStore.getState().permission).toBe('denied');

    mocked.getPermissionsAsync.mockRejectedValueOnce(new Error('boom'));
    await expect(scheduleDemoReminderIfDemo(appointment, 'tz')).resolves.toBeUndefined();
  });
});
