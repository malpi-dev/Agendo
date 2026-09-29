import { Modal, Pressable, View } from 'react-native';

import { useSessionStore } from '@/core/session';
import { AppText, Button } from '@/core/ui';
import type { UserRole } from '@/features/auth/domain/profile';

interface RoleOptionProps {
  title: string;
  description: string;
  onPress: () => void;
  testID: string;
}

function RoleOption({ title, description, onPress, testID }: RoleOptionProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className="gap-1 rounded-2xl border border-border bg-background p-4 active:opacity-80"
    >
      <AppText variant="subtitle">{title}</AppText>
      <AppText tone="muted">{description}</AppText>
    </Pressable>
  );
}

interface DemoRoleSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function DemoRoleSheet({ visible, onClose }: DemoRoleSheetProps) {
  const enterDemo = useSessionStore((s) => s.enterDemo);
  const choose = (role: UserRole) => {
    onClose();
    enterDemo(role);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Pressable className="gap-3 rounded-t-3xl bg-surface p-6 pb-10" onPress={() => undefined}>
          <AppText variant="title">Explore as</AppText>
          <RoleOption
            testID="demo-role-client"
            title="Client"
            description="Book and manage appointments"
            onPress={() => choose('client')}
          />
          <RoleOption
            testID="demo-role-admin"
            title="Admin"
            description="See today's agenda for the whole team"
            onPress={() => choose('admin')}
          />
          <View className="mt-2">
            <Button title="Cancel" variant="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
