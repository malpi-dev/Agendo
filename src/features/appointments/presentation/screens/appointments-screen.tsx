import { AppText, Screen } from '@/core/ui';

// Provisional: replaced in phase 08.
export default function AppointmentsScreen() {
  return (
    <Screen edges={['left', 'right']} className="pt-4" testID="appointments-screen">
      <AppText variant="title">Appointments</AppText>
    </Screen>
  );
}
