import { useState } from 'react';
import { View } from 'react-native';

import { isSupabaseConfigured } from '@/core/config/env';
import { AppText, Button, Screen } from '@/core/ui';
import { DemoRoleSheet } from '@/features/demo/presentation/components/demo-role-sheet';

export default function SignInScreen() {
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);

  return (
    <Screen className="justify-center gap-8">
      <View className="gap-3">
        <AppText variant="title" tone="primary" className="text-4xl">
          Agendo
        </AppText>
        <AppText tone="muted">
          Book appointments in seconds — live availability, zero double bookings.
        </AppText>
      </View>

      {/* Email + OTP form arrives in phase 07. */}
      {!isSupabaseConfigured ? (
        <AppText variant="caption" tone="muted" testID="backend-not-configured">
          Backend not configured — you can still explore the demo.
        </AppText>
      ) : null}

      <Button
        title="Explore demo"
        variant="secondary"
        onPress={() => setRoleSheetOpen(true)}
        testID="explore-demo-button"
      />
      <DemoRoleSheet visible={roleSheetOpen} onClose={() => setRoleSheetOpen(false)} />
    </Screen>
  );
}
