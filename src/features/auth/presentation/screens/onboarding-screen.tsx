import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';
import { AppText, Button, Screen, TextField } from '@/core/ui';

import { fullNameSchema } from '../../domain/validation';
import { authErrorMessage } from '../auth-error-message';

const formSchema = z.object({ fullName: fullNameSchema });
type FormValues = z.infer<typeof formSchema>;

export default function OnboardingScreen() {
  const { profile } = useRepositories();
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { fullName: '' },
  });

  // Once the profile is cached the route guards move the user to the tabs.
  const createProfile = useMutation({
    mutationFn: ({ fullName }: FormValues) => profile.ensureMine(fullName),
    onSuccess: (created) => queryClient.setQueryData(queryKeys.profileMine, created),
  });

  return (
    <Screen scroll className="justify-center gap-6 pt-16">
      <View className="gap-2">
        <AppText variant="title">What&apos;s your name?</AppText>
        <AppText tone="muted">We use it so your barber or clinic knows who is coming.</AppText>
      </View>
      <Controller
        control={control}
        name="fullName"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Full name"
            testID="full-name-input"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Alex Rivera"
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            error={errors.fullName ? 'Enter your name (2 to 80 characters)' : undefined}
          />
        )}
      />
      {createProfile.isError ? (
        <AppText variant="caption" tone="danger" testID="onboarding-error">
          {authErrorMessage(createProfile.error)}
        </AppText>
      ) : null}
      <Button
        title="Continue"
        testID="onboarding-continue"
        loading={createProfile.isPending}
        onPress={() => void handleSubmit((values) => createProfile.mutate(values))()}
      />
    </Screen>
  );
}
