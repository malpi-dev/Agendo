import { Text, type TextProps } from 'react-native';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'label';
export type TextTone = 'default' | 'muted' | 'danger' | 'primary';

const VARIANT_CLASS: Record<TextVariant, string> = {
  title: 'font-bold text-2xl',
  subtitle: 'font-semibold text-lg',
  body: 'font-sans text-base',
  caption: 'font-sans text-sm',
  label: 'font-semibold text-sm',
};

const TONE_CLASS: Record<TextTone, string> = {
  default: 'text-text',
  muted: 'text-text-muted',
  danger: 'text-danger',
  primary: 'text-primary',
};

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Tabular numerals, for times and prices. */
  tabular?: boolean;
  className?: string;
}

export function AppText({
  variant = 'body',
  tone = 'default',
  tabular = false,
  className = '',
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      className={`${VARIANT_CLASS[variant]} ${TONE_CLASS[tone]} ${className}`}
      style={[tabular ? { fontVariant: ['tabular-nums'] } : null, style]}
      {...rest}
    />
  );
}
