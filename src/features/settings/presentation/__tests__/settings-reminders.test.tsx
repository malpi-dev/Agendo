import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

import { useSessionStore } from '@/core/session';
import { useNotificationsStore } from '@/features/notifications/presentation/notifications-store';
import { renderWithProviders } from '@/test/render-with-providers';

import SettingsScreen from '../screens/settings-screen';

jest.mock('expo-device', () => ({ __esModule: true, isDevice: true }));

/** Waits for the About section's business query so no update lands outside act(). */
async function renderSettings() {
  const result = await renderWithProviders(<SettingsScreen />);
  await screen.findByTestId('about-timezone', {}, { timeout: 10000 });
  return result;
}

const mocked = jest.mocked(Notifications);
const device = Device as { isDevice: boolean };

beforeEach(() => {
  jest.clearAllMocks();
  device.isDevice = true;
  mocked.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
  useNotificationsStore.setState({ permission: 'unknown', token: undefined });
  useSessionStore.setState({ mode: 'supabase' });
});

describe('Settings > Reminders', () => {
  it('shows a placeholder while the permission is being checked', async () => {
    mocked.getPermissionsAsync.mockReturnValue(new Promise(() => undefined));
    await renderSettings();
    expect(screen.getByTestId('reminders-loading', { includeHiddenElements: true })).toBeTruthy();
  }, 20000);

  it('shows "On" when the permission is granted', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    await renderSettings();
    expect(await screen.findByTestId('reminders-on', {}, { timeout: 10000 })).toBeTruthy();
  }, 20000);

  it('shows "Reminders disabled" with a button that opens the system settings', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await renderSettings();
    expect(await screen.findByTestId('reminders-disabled', {}, { timeout: 10000 })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('reminders-open-settings'));
    expect(openSettings).toHaveBeenCalled();
  }, 20000);

  it('shows "Not available on this device" on an emulator', async () => {
    device.isDevice = false;
    await renderSettings();
    expect(await screen.findByTestId('reminders-unavailable', {}, { timeout: 10000 })).toBeTruthy();
  }, 20000);

  it('in demo mode local notifications are checked even on an emulator', async () => {
    device.isDevice = false;
    useSessionStore.setState({ mode: 'demo' });
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    await renderSettings();
    await waitFor(() => expect(screen.getByTestId('reminders-on')).toBeTruthy(), {
      timeout: 10000,
    });
  }, 20000);
});
