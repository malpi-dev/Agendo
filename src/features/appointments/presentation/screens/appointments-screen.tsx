import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useNow } from '@/core/time/use-now';
import { AppText, EmptyState, ErrorState, Screen, Skeleton } from '@/core/ui';
import { useBusiness } from '@/features/catalog/presentation/hooks/use-business';

import type { Appointment } from '../../domain/appointment';
import { AppointmentCard } from '../components/appointment-card';
import { useMyAppointments } from '../hooks/use-my-appointments';

type Row =
  | { type: 'header'; key: string; title: string }
  | { type: 'note'; key: string; text: string }
  | { type: 'appointment'; key: string; appointment: Appointment };

function buildRows(upcoming: Appointment[], past: Appointment[]): Row[] {
  const toRows = (list: Appointment[]): Row[] =>
    list.map((appointment) => ({ type: 'appointment', key: appointment.id, appointment }));
  return [
    { type: 'header', key: 'h-upcoming', title: 'Upcoming' },
    ...(upcoming.length > 0
      ? toRows(upcoming)
      : [{ type: 'note', key: 'n-upcoming', text: 'Nothing upcoming' } as const]),
    { type: 'header', key: 'h-past', title: 'Past & cancelled' },
    ...(past.length > 0
      ? toRows(past)
      : [{ type: 'note', key: 'n-past', text: 'Nothing here yet' } as const]),
  ];
}

export default function AppointmentsScreen() {
  const appointments = useMyAppointments();
  const business = useBusiness();
  const now = useNow();
  const { upcoming, past } = appointments;
  const rows = useMemo(() => buildRows(upcoming, past), [upcoming, past]);

  const openDetail = (a: Appointment) =>
    router.push({ pathname: '/appointments/[id]', params: { id: a.id } });

  return (
    <Screen edges={['left', 'right']} testID="appointments-screen">
      {appointments.isPending || business.isPending ? (
        <View className="gap-3 pt-4" testID="appointments-loading">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </View>
      ) : appointments.isError || business.isError ? (
        <ErrorState
          error={appointments.error ?? business.error}
          onRetry={() => {
            void appointments.refetch();
            void business.refetch();
          }}
          testID="appointments-error"
        />
      ) : upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          message="Book your first appointment and it will show up here."
          actionLabel="Book now"
          actionTestID="book-now-button"
          onAction={() => router.navigate('/')}
          testID="appointments-empty"
        />
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(row) => row.key}
          getItemType={(row) => row.type}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={appointments.isRefetching}
          onRefresh={() => void appointments.refetch()}
          renderItem={({ item }) => {
            switch (item.type) {
              case 'header':
                return (
                  <AppText variant="subtitle" className="pb-2 pt-5" accessibilityRole="header">
                    {item.title}
                  </AppText>
                );
              case 'note':
                return (
                  <AppText tone="muted" className="pb-1">
                    {item.text}
                  </AppText>
                );
              case 'appointment':
                return (
                  <View className="pb-3">
                    <AppointmentCard
                      appointment={item.appointment}
                      timeZone={business.data.timezone}
                      now={now}
                      onPress={openDetail}
                    />
                  </View>
                );
            }
          }}
        />
      )}
    </Screen>
  );
}
