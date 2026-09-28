import { ActivityIndicator, Pressable } from 'react-native';

import { useThemeColors } from '@/core/theme';

import { AppText, type TextTone } from './app-text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface border border-border',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  className?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  testID,
  className = '',
}: ButtonProps) {
  const colors = useThemeColors();
  const inactive = disabled || loading;
  const solid = variant === 'primary' || variant === 'danger';
  const tone: TextTone = variant === 'ghost' ? 'primary' : 'default';
  const spinnerColor = solid ? colors.onPrimary : colors.primary;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center rounded-xl px-5 active:opacity-80 ${CONTAINER[variant]} ${inactive ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <AppText variant="label" tone={tone} className={solid ? 'text-on-primary' : ''}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}
