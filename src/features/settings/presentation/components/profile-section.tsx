import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';
import { useSessionStore } from '@/core/session';
import { AppText, Button, Card, showToast, Skeleton, TextField } from '@/core/ui';
import { getErrorPresentation, toDomainError } from '@/core/errors';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { authErrorMessage } from '@/features/auth/presentation/auth-error-message';
import { useCurrentUser } from '@/features/auth/presentation/hooks/use-current-user';
import { useMyProfile } from '@/features/auth/presentation/hooks/use-my-profile';
import { fullNameSchema } from '@/features/auth/domain/validation';
import { DEMO_USER_NAME } from '@/features/demo/data/fixtures';

const formSchema = z.object({ fullName: fullNameSchema });
type FormValues = z.infer<typeof formSchema>;

/** Editable name (real accounts) and read-only email. Demo shows a fixed account. */
export function ProfileSection() {
  const mode = useSessionStore((s) => s.mode);
  const email = useAuthStore((s) => s.session?.email);
  const user = useCurrentUser();
  const profileQuery = useMyProfile();

  return (
    <Card className="gap-3" testID="profile-section">
      <AppText variant="subtitle">Profile</AppText>
      {mode === 'demo' ? (
        <AppText tone="muted" testID="settings-demo-account">
          {DEMO_USER_NAME} · demo account
        </AppText>
      ) : user ? (
        <NameForm initialName={user.fullName} />
      ) : profileQuery.isError ? (
        <>
          <AppText tone="danger" variant="caption" testID="profile-error">
            {getErrorPresentation(toDomainError(profileQuery.error).code).message}
          </AppText>
          <Button
            title="Retry"
            variant="secondary"
            onPress={() => void profileQuery.refetch()}
            testID="profile-retry"
          />
        </>
      ) : (
        <Skeleton className="h-12 w-full" testID="profile-loading" />
      )}
      {mode === 'supabase' && email ? (
        <AppText tone="muted" variant="caption" testID="settings-email">
          {email}
        </AppText>
      ) : null}
    </Card>
  );
}

function NameForm({ initialName }: { initialName: string }) {
  const { profile } = useRepositories();
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { fullName: initialName },
  });

  const save = useMutation({
    mutationFn: ({ fullName }: FormValues) => profile.updateName(fullName),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profileMine });
      reset({ fullName: updated.fullName });
      showToast('Name updated', 'success');
    },
  });

  return (
    <>
      <Controller
        control={control}
        name="fullName"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Full name"
            testID="settings-name-input"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => void handleSubmit((v) => save.mutate(v))()}
            error={errors.fullName ? 'Enter your name (2 to 80 characters)' : undefined}
          />
        )}
      />
      {save.isError ? (
        <AppText variant="caption" tone="danger" testID="settings-name-error">
          {authErrorMessage(save.error)}
        </AppText>
      ) : null}
      <Button
        title="Save"
        testID="save-name-button"
        loading={save.isPending}
        disabled={!isDirty}
        onPress={() => void handleSubmit((v) => save.mutate(v))()}
      />
    </>
  );
}
