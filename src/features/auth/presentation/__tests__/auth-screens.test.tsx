import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { DomainError } from '@/core/errors';
import type { AuthRepository } from '@/features/auth/domain/auth-repository';
import type { ProfileRepository } from '@/features/auth/domain/profile-repository';
import { renderWithProviders } from '@/test/render-with-providers';

import OnboardingScreen from '../screens/onboarding-screen';
import SignInScreen from '../screens/sign-in-screen';
import VerifyScreen from '../screens/verify-screen';

// The first render pulls in the whole UI tree; on a cold CI runner it can exceed the 5 s default.
jest.setTimeout(30_000);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@/core/config/env', () => ({
  env: { EXPO_PUBLIC_DATA_SOURCE: 'supabase' },
  isSupabaseConfigured: true,
}));

const makeAuth = (overrides: Partial<AuthRepository> = {}): AuthRepository => ({
  sendCode: jest.fn().mockResolvedValue(undefined),
  verifyCode: jest.fn().mockResolvedValue({ userId: 'u1', email: 'a@b.dev' }),
  getSession: jest.fn().mockResolvedValue(null),
  onAuthChange: jest.fn(() => () => undefined),
  signOut: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('SignInScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows an inline error and does not send a code for an invalid email', async () => {
    const auth = makeAuth();
    await renderWithProviders(<SignInScreen />, { repositories: { auth } });
    await fireEvent.changeText(screen.getByTestId('email-input'), 'not-an-email');
    await fireEvent.press(screen.getByTestId('send-code-button'));
    await waitFor(() => expect(screen.getByText('Enter a valid email address')).toBeTruthy());
    expect(auth.sendCode).not.toHaveBeenCalled();
  });

  it('sends the code and goes to the verify screen for a valid email', async () => {
    const auth = makeAuth();
    await renderWithProviders(<SignInScreen />, { repositories: { auth } });
    await fireEvent.changeText(screen.getByTestId('email-input'), 'a@b.dev');
    await fireEvent.press(screen.getByTestId('send-code-button'));
    await waitFor(() => expect(auth.sendCode).toHaveBeenCalledWith('a@b.dev'));
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/verify',
        params: { email: 'a@b.dev' },
      }),
    );
  });

  it('shows the rate limit message', async () => {
    const auth = makeAuth({
      sendCode: jest.fn().mockRejectedValue(new DomainError('rateLimited')),
    });
    await renderWithProviders(<SignInScreen />, { repositories: { auth } });
    await fireEvent.changeText(screen.getByTestId('email-input'), 'a@b.dev');
    await fireEvent.press(screen.getByTestId('send-code-button'));
    await waitFor(() =>
      expect(
        screen.getByText('Too many attempts. Please wait a moment and try again.'),
      ).toBeTruthy(),
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('keeps Explore demo available', async () => {
    await renderWithProviders(<SignInScreen />, { repositories: { auth: makeAuth() } });
    expect(screen.getByTestId('explore-demo-button')).toBeTruthy();
  });
});

describe('VerifyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useLocalSearchParams).mockReturnValue({ email: 'a@b.dev' });
  });

  it('verifies automatically once 6 digits are entered', async () => {
    const auth = makeAuth();
    await renderWithProviders(<VerifyScreen />, { repositories: { auth } });
    expect(screen.getByText('We sent a 6-digit code to a@b.dev')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    await waitFor(() => expect(auth.verifyCode).toHaveBeenCalledWith('a@b.dev', '123456'));
  });

  it('does not verify with fewer than 6 digits', async () => {
    const auth = makeAuth();
    await renderWithProviders(<VerifyScreen />, { repositories: { auth } });
    await fireEvent.changeText(screen.getByTestId('otp-input'), '123');
    await fireEvent.press(screen.getByTestId('verify-button'));
    expect(auth.verifyCode).not.toHaveBeenCalled();
  });

  it('shows an inline message for an invalid code and stays on the screen', async () => {
    const auth = makeAuth({
      verifyCode: jest.fn().mockRejectedValue(new DomainError('invalidCode')),
    });
    await renderWithProviders(<VerifyScreen />, { repositories: { auth } });
    await fireEvent.changeText(screen.getByTestId('otp-input'), '000000');
    await waitFor(() =>
      expect(screen.getByText('The code is invalid or has expired')).toBeTruthy(),
    );
    expect(router.back).not.toHaveBeenCalled();
  });

  describe('resend', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('is disabled for 60 seconds with a countdown, then enabled', async () => {
      const auth = makeAuth();
      await renderWithProviders(<VerifyScreen />, { repositories: { auth } });
      const resend = () => screen.getByTestId('resend-button');
      expect(resend().props.accessibilityState.disabled).toBe(true);
      expect(screen.getByText('Resend code in 60s')).toBeTruthy();

      const tick = async (seconds: number) => {
        for (let i = 0; i < seconds; i++) {
          await act(async () => {
            jest.advanceTimersByTime(1000);
          });
        }
      };
      await tick(30);
      expect(screen.getByText('Resend code in 30s')).toBeTruthy();

      await tick(30);
      expect(resend().props.accessibilityState.disabled).toBe(false);
      expect(screen.getByText('Resend code')).toBeTruthy();
    });
  });
});

describe('OnboardingScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  const makeProfile = (): ProfileRepository => ({
    getMine: jest.fn().mockResolvedValue(null),
    ensureMine: jest.fn().mockResolvedValue({ id: 'u1', fullName: 'Casey', role: 'client' }),
    updateName: jest.fn(),
  });

  it('rejects a 1 character name', async () => {
    const profile = makeProfile();
    await renderWithProviders(<OnboardingScreen />, { repositories: { profile } });
    await fireEvent.changeText(screen.getByTestId('full-name-input'), 'A');
    await fireEvent.press(screen.getByTestId('onboarding-continue'));
    await waitFor(() => expect(screen.getByText(/Enter your name/)).toBeTruthy());
    expect(profile.ensureMine).not.toHaveBeenCalled();
  });

  it('creates the profile through ensureMine for a valid name', async () => {
    const profile = makeProfile();
    const { queryClient } = await renderWithProviders(<OnboardingScreen />, {
      repositories: { profile },
    });
    await fireEvent.changeText(screen.getByTestId('full-name-input'), 'Casey Morgan');
    await fireEvent.press(screen.getByTestId('onboarding-continue'));
    await waitFor(() => expect(profile.ensureMine).toHaveBeenCalledWith('Casey Morgan'));
    await waitFor(() =>
      expect(queryClient.getQueryData(['profile', 'mine'])).toMatchObject({ id: 'u1' }),
    );
  });
});
