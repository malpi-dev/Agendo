import { Stack } from 'expo-router';

import { useThemeColors } from '@/core/theme';

export default function AppLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: 'Manrope_700Bold' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="book/[serviceId]/index" options={{ title: 'Choose a professional' }} />
      <Stack.Screen name="book/[serviceId]/[professionalId]" options={{ title: 'Choose a time' }} />
      <Stack.Screen name="book/confirm" options={{ title: 'Confirm booking' }} />
      <Stack.Screen name="appointments/[id]" options={{ title: 'Appointment' }} />
    </Stack>
  );
}
