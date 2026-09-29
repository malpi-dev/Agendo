import { Stack } from 'expo-router';

// Without an anchor, a cold start can land on `verify` (no email, no code sent) instead of `sign-in`.
export const unstable_settings = { anchor: 'sign-in' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
