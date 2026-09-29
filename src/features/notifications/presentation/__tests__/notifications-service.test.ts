import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import {
  getPermissionStatus,
  registerForPushAsync,
  requestPermission,
  scheduleDemoReminder,
} from '../notifications-service';

jest.mock('expo-device', () => ({ __esModule: true, isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'project-1' } } }, easConfig: null },
}));

const mocked = jest.mocked(Notifications);
const device = Device as { isDevice: boolean };

beforeEach(() => {
  jest.clearAllMocks();
  device.isDevice = true;
  mocked.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
  mocked.requestPermissionsAsync.mockResolvedValue({ granted: false } as never);
  mocked.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[t]' } as never);
});

describe('registerForPushAsync', () => {
  it('is unavailable on an emulator and does not prompt', async () => {
    device.isDevice = false;
    await expect(registerForPushAsync()).resolves.toEqual({ status: 'unavailable' });
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('is denied when the user refuses the permission', async () => {
    await expect(registerForPushAsync()).resolves.toEqual({ status: 'denied' });
    expect(mocked.requestPermissionsAsync).toHaveBeenCalled();
    expect(mocked.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('creates the channel first and returns the token when granted', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    await expect(registerForPushAsync()).resolves.toEqual({
      status: 'granted',
      token: 'ExponentPushToken[t]',
    });
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
      'reminders',
      expect.objectContaining({ importance: 4 }),
    );
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mocked.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'project-1' });
  });

  it('is unavailable when the token cannot be obtained', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mocked.getExpoPushTokenAsync.mockRejectedValue(new Error('no FCM'));
    await expect(registerForPushAsync()).resolves.toEqual({ status: 'unavailable' });
  });

  it('is unavailable without an EAS project id', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    const constants = Constants as unknown as { expoConfig: unknown };
    const original = constants.expoConfig;
    constants.expoConfig = { extra: {} };
    try {
      await expect(registerForPushAsync()).resolves.toEqual({ status: 'unavailable' });
    } finally {
      constants.expoConfig = original;
    }
  });
});

describe('permission helpers', () => {
  it('getPermissionStatus never prompts; local (demo) mode ignores the emulator check', async () => {
    device.isDevice = false;
    await expect(getPermissionStatus()).resolves.toBe('unavailable');
    await expect(getPermissionStatus(false)).resolves.toBe('denied');
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requestPermission(false) prompts even on an emulator', async () => {
    device.isDevice = false;
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
    await expect(requestPermission(false)).resolves.toBe('granted');
  });
});

describe('scheduleDemoReminder', () => {
  it('schedules a local notification 10 seconds out that carries the appointment id', async () => {
    await scheduleDemoReminder(
      {
        id: 'a1',
        start: new Date('2026-09-29T16:00:00Z'), // 10:00 AM in Mexico City
        serviceName: 'Haircut',
        professionalName: 'Marco',
      },
      'America/Mexico_City',
    );
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: expect.objectContaining({
        title: 'Reminder: Haircut',
        body: '10:00 AM with Marco (demo)',
        data: { appointmentId: 'a1' },
      }),
      trigger: expect.objectContaining({ seconds: 10, channelId: 'reminders' }),
    });
  });
});
