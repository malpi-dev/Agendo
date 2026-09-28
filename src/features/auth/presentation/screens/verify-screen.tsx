import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { useRepositories } from '@/core/di';
import { AppText, Button, Screen, showToast } from '@/core/ui';

import { otpSchema } from '../../domain/validation';
import { authErrorMessage } from '../auth-error-message';
import { OtpInput } from '../components/otp-input';

export const RESEND_SECONDS = 60;

export default function VerifyScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const { auth } = useRepositories();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Success needs no navigation: the session change drives the route guards.
  const verify = useMutation({
    mutationFn: (value: string) => auth.verifyCode(email, value),
    onError: () => setCode(''),
  });

  const resend = useMutation({
    mutationFn: () => auth.sendCode(email),
    onSuccess: () => {
      setSecondsLeft(RESEND_SECONDS);
      showToast('A new code was sent', 'success');
    },
  });

  const submit = useCallback(
    (value: string) => {
      if (otpSchema.safeParse(value).success && !verify.isPending) verify.mutate(value);
    },
    [verify],
  );

  const onChange = (value: string) => {
    if (verify.isError) verify.reset();
    setCode(value);
    if (value.length === 6) submit(value);
  };

  const error = verify.isError ? verify.error : resend.isError ? resend.error : null;

  return (
    <Screen scroll className="justify-center gap-6 pt-16">
      <View className="gap-2">
        <AppText variant="title">Enter your code</AppText>
        <AppText tone="muted">We sent a 6-digit code to {email}</AppText>
      </View>

      <OtpInput
        value={code}
        onChange={onChange}
        editable={!verify.isPending}
        hasError={verify.isError}
      />

      {error ? (
        <AppText variant="caption" tone="danger" testID="verify-error">
          {authErrorMessage(error)}
        </AppText>
      ) : null}

      <Button
        title="Verify"
        testID="verify-button"
        loading={verify.isPending}
        disabled={code.length !== 6}
        onPress={() => submit(code)}
      />
      <Button
        title={secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
        variant="ghost"
        testID="resend-button"
        loading={resend.isPending}
        disabled={secondsLeft > 0}
        onPress={() => resend.mutate()}
      />
      <Button
        title="Use a different email"
        variant="ghost"
        testID="change-email-button"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
