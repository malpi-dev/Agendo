import type { ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';

import { useApplyTheme } from './use-apply-theme';

/** Applies the persisted theme preference and matches the status bar to it. */
export function ThemeGate({ children }: { children: ReactNode }) {
  const scheme = useApplyTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </>
  );
}
