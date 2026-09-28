import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppText } from './app-text';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  testID?: string;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export function Avatar({ name, avatarUrl, size = 48, testID }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (avatarUrl) {
    return (
      <Image
        testID={testID}
        source={{ uri: avatarUrl }}
        style={dimension}
        accessibilityLabel={name}
      />
    );
  }
  return (
    <View
      testID={testID}
      accessibilityLabel={name}
      className="items-center justify-center bg-primary/15"
      style={dimension}
    >
      <AppText variant="label" tone="primary">
        {initialsOf(name)}
      </AppText>
    </View>
  );
}
