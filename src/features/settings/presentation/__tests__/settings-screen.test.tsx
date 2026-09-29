import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DomainError } from '@/core/errors';
import { useSessionStore } from '@/core/session';
import { useThemeStore } from '@/core/theme';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import type { ProfileRepository } from '@/features/auth/domain/profile-repository';
import { renderWithProviders } from '@/test/render-with-providers';

import SettingsScreen from '../screens/settings-screen';

jest.setTimeout(30_000);

jest.mock('expo-device', () => ({ __esModule: true, isDevice: true }));

const makeProfile = (overrides: Partial<ProfileRepository> = {}): ProfileRepository => ({
  getMine: jest.fn().mockResolvedValue({ id: 'u1', fullName: 'Alex Rivera', role: 'client' }),
  ensureMine: jest.fn(),
  updateName: jest.fn().mockResolvedValue({ id: 'u1', fullName: 'Alex R.', role: 'client' }),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({ mode: 'supabase' });
  useAuthStore.setState({
    status: 'signedIn',
    session: { userId: 'u1', email: 'alex@example.dev' },
  });
  useThemeStore.setState({ preference: 'system' });
});

describe('Settings > Profile', () => {
  it('saves a valid name through updateName and invalidates the profile', async () => {
    const profile = makeProfile();
    const { queryClient } = await renderWithProviders(<SettingsScreen />, {
      repositories: { profile },
    });
    const input = await screen.findByTestId('settings-name-input', {}, { timeout: 10000 });
    expect(screen.getByTestId('settings-email').props.children).toBe('alex@example.dev');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await fireEvent.changeText(input, 'Alex R.');
    await fireEvent.press(screen.getByTestId('save-name-button'));
    await waitFor(() => expect(profile.updateName).toHaveBeenCalledWith('Alex R.'));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['profile', 'mine'] }));
  });

  it('shows an inline error and does not save an invalid name', async () => {
    const profile = makeProfile();
    await renderWithProviders(<SettingsScreen />, { repositories: { profile } });
    const input = await screen.findByTestId('settings-name-input', {}, { timeout: 10000 });
    await fireEvent.changeText(input, 'A');
    await fireEvent.press(screen.getByTestId('save-name-button'));
    expect(await screen.findByText('Enter your name (2 to 80 characters)')).toBeTruthy();
    expect(profile.updateName).not.toHaveBeenCalled();
  });

  it('shows the save error inline', async () => {
    const profile = makeProfile({ updateName: jest.fn().mockRejectedValue(new Error('boom')) });
    await renderWithProviders(<SettingsScreen />, { repositories: { profile } });
    const input = await screen.findByTestId('settings-name-input', {}, { timeout: 10000 });
    await fireEvent.changeText(input, 'Alex R.');
    await fireEvent.press(screen.getByTestId('save-name-button'));
    expect(await screen.findByTestId('settings-name-error')).toBeTruthy();
  });

  it('shows an error with retry when the profile cannot be loaded', async () => {
    const getMine = jest
      .fn()
      .mockRejectedValueOnce(new DomainError('network'))
      .mockResolvedValue({ id: 'u1', fullName: 'Alex Rivera', role: 'client' });
    await renderWithProviders(<SettingsScreen />, {
      repositories: { profile: makeProfile({ getMine }) },
    });
    expect(await screen.findByTestId('profile-error', {}, { timeout: 10000 })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('profile-retry'));
    expect(await screen.findByTestId('settings-name-input', {}, { timeout: 10000 })).toBeTruthy();
  });

  it('in demo mode shows a fixed account without editing', async () => {
    useSessionStore.setState({ mode: 'demo' });
    await renderWithProviders(<SettingsScreen />);
    await screen.findByTestId('about-timezone', {}, { timeout: 10000 });
    expect(screen.getByTestId('settings-demo-account')).toBeTruthy();
    expect(screen.queryByTestId('save-name-button')).toBeNull();
    expect(screen.getByTestId('demo-exit')).toBeTruthy();
    expect(screen.queryByTestId('sign-out-button')).toBeNull();
  });
});

describe('Settings > Appearance and About', () => {
  it('updates the theme store from the segmented control', async () => {
    await renderWithProviders(<SettingsScreen />);
    await screen.findByTestId('about-timezone', {}, { timeout: 10000 });
    await fireEvent.press(screen.getByTestId('theme-dark'));
    expect(useThemeStore.getState().preference).toBe('dark');
    await fireEvent.press(screen.getByTestId('theme-light'));
    expect(useThemeStore.getState().preference).toBe('light');
    await fireEvent.press(screen.getByTestId('theme-system'));
    expect(useThemeStore.getState().preference).toBe('system');
  });

  it('shows the business timezone', async () => {
    await renderWithProviders(<SettingsScreen />);
    const tz = await screen.findByTestId('about-timezone', {}, { timeout: 10000 });
    expect(JSON.stringify(tz.props.children)).toContain('timezone');
  });
});
