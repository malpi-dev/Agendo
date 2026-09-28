import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { isSupabaseConfigured } from '@/core/config/env';
import { useRepositoriesOrNull } from '@/core/di';
import { AppText, Button, Screen, TextField } from '@/core/ui';
import { DemoRoleSheet } from '@/features/demo/presentation/components/demo-role-sheet';

import { emailSchema } from '../../domain/validation';
import { authErrorMessage } from '../auth-error-message';

const formSchema = z.object({ email: emailSchema });
type FormValues = z.infer<typeof formSchema>;

export default function SignInScreen() {
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const repositories = useRepositoriesOrNull();
  const canSignIn = isSupabaseConfigured && repositories !== null;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const sendCode = useMutation({
    mutationFn: ({ email }: FormValues) => {
      if (!repositories) throw new Error('Repositories not available');
      return repositories.auth.sendCode(email);
    },
    onSuccess: (_data, { email }) => router.push({ pathname: '/verify', params: { email } }),
  });

  return (
    <Screen scroll className="justify-center gap-8 pt-16">
      <View className="gap-3">
        <AppText variant="title" tone="primary" className="text-4xl">
          Agendo
        </AppText>
        <AppText tone="muted">
          Book appointments in seconds — live availability, zero double bookings.
        </AppText>
      </View>

      {canSignIn ? (
        <View className="gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Email"
                testID="email-input"
                value={value}
                onChangeText={(text) => {
                  sendCode.reset();
                  onChange(text.trim());
                }}
                onBlur={onBlur}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                error={errors.email ? 'Enter a valid email address' : undefined}
              />
            )}
          />
          {sendCode.isError ? (
            <AppText variant="caption" tone="danger" testID="send-code-error">
              {authErrorMessage(sendCode.error)}
            </AppText>
          ) : null}
          <Button
            title="Send code"
            testID="send-code-button"
            loading={sendCode.isPending}
            onPress={() => void handleSubmit((values) => sendCode.mutate(values))()}
          />
          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <AppText variant="caption" tone="muted">
              or
            </AppText>
            <View className="h-px flex-1 bg-border" />
          </View>
        </View>
      ) : (
        <AppText variant="caption" tone="muted" testID="backend-not-configured">
          Backend not configured — you can still explore the demo.
        </AppText>
      )}

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
