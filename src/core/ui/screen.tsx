import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  className?: string;
  testID?: string;
}

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  className = '',
  testID,
}: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={edges} testID={testID}>
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={`px-4 pb-8 ${className}`}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 px-4 ${className}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
