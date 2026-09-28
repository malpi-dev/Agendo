import { useLocalSearchParams } from 'expo-router';

import { AppointmentDetailContent } from '../components/appointment-detail-content';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AppointmentDetailContent id={id} />;
}
