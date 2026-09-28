import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { useThemeColors } from '@/core/theme';
import { useCurrentUser } from '@/features/auth/presentation/hooks/use-current-user';
import { DemoBadge } from '@/features/demo/presentation/components/demo-badge';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabIconProps {
  name: IconName;
  focusedName: IconName;
  focused: boolean;
  color: ColorValue;
  size: number;
}

function TabIcon({ name, focusedName, focused, color, size }: TabIconProps) {
  return <Ionicons name={focused ? focusedName : name} size={size} color={color} />;
}

const icon = (name: IconName, focusedName: IconName) =>
  function renderIcon(props: { color: ColorValue; size: number; focused: boolean }) {
    return <TabIcon name={name} focusedName={focusedName} {...props} />;
  };

export default function TabsLayout() {
  const colors = useThemeColors();
  const user = useCurrentUser();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: 'Manrope_700Bold' },
        headerRight: () => (
          <View className="mr-4">
            <DemoBadge />
          </View>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: icon('home-outline', 'home'),
          tabBarButtonTestID: 'tab-home',
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: icon('calendar-outline', 'calendar'),
          tabBarButtonTestID: 'tab-appointments',
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: icon('people-outline', 'people'),
          tabBarButtonTestID: 'tab-agenda',
          href: user?.role === 'admin' ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: icon('settings-outline', 'settings'),
          tabBarButtonTestID: 'tab-settings',
        }}
      />
    </Tabs>
  );
}
