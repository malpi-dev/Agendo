import { useColorScheme } from 'nativewind';

/** Raw hex values for places that cannot use className. Must match src/global.css. */
export const themeTokens = {
  light: {
    primary: '#0F766E',
    onPrimary: '#FFFFFF',
    accent: '#F97360',
    background: '#F7F8F6',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF2F0',
    text: '#111827',
    textMuted: '#6B7280',
    border: '#E2E8E4',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
  },
  dark: {
    primary: '#2DD4BF',
    onPrimary: '#042F2E',
    accent: '#FB8A7A',
    background: '#0B1215',
    surface: '#131C20',
    surfaceMuted: '#1B262B',
    text: '#E6EDEA',
    textMuted: '#94A3A0',
    border: '#24323A',
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#F87171',
  },
} as const;

export type ThemeColors = (typeof themeTokens)[keyof typeof themeTokens];

export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? themeTokens.dark : themeTokens.light;
}
