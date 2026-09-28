import { Redirect } from 'expo-router';

import { AppText, Screen } from '@/core/ui';
import { useCurrentUser } from '@/features/auth/presentation/hooks/use-current-user';

// Provisional: replaced in phase 09.
export default function AgendaScreen() {
  const user = useCurrentUser();
  if (user?.role !== 'admin') return <Redirect href="/" />;

  return (
    <Screen edges={['left', 'right']} className="pt-4" testID="agenda-screen">
      <AppText variant="title">Agenda</AppText>
    </Screen>
  );
}
