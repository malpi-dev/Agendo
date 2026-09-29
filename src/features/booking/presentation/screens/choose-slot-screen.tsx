import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import { useNow } from '@/core/time/use-now';
import type { LocalDate } from '@/core/time';
import { ErrorState, Screen, Skeleton } from '@/core/ui';
import { useBusiness } from '@/features/catalog/presentation/hooks/use-business';
import { useWorkingHours } from '@/features/catalog/presentation/hooks/use-working-hours';

import { getBookableDays } from '../../domain/get-bookable-days';
import { RescheduleBanner } from '../components/reschedule-banner';
import { ChooseSlotView } from '../components/choose-slot-view';
import { useAvailabilitySubscription } from '../hooks/use-availability-subscription';
import { useAvailableSlots } from '../hooks/use-available-slots';

export default function ChooseSlotScreen() {
  const { serviceId, professionalId, rescheduleId } = useLocalSearchParams<{
    serviceId: string;
    professionalId: string;
    rescheduleId?: string;
  }>();
  const business = useBusiness();
  const workingHours = useWorkingHours(professionalId);
  const now = useNow();
  const [pickedDate, setPickedDate] = useState<LocalDate | null>(null);

  const days = useMemo(
    () =>
      business.data && workingHours.data
        ? getBookableDays({ now, business: business.data, workingHours: workingHours.data })
        : [],
    [now, business.data, workingHours.data],
  );
  const selectedDate = pickedDate ?? days.find((d) => !d.isDisabled)?.date ?? null;

  const liveStatus = useAvailabilitySubscription(professionalId);
  const availability = useAvailableSlots({
    serviceId,
    professionalId,
    date: selectedDate,
    rescheduleId,
  });

  const setupError = business.error ?? workingHours.error;
  if (setupError) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState
          error={setupError}
          onRetry={() => {
            void business.refetch();
            void workingHours.refetch();
          }}
        />
      </Screen>
    );
  }
  if (!business.data) {
    return (
      <Screen edges={['left', 'right']} className="pt-4">
        <Skeleton className="h-20 w-full" />
      </Screen>
    );
  }

  const goToNextDay = () => {
    const next = days.find((d) => !d.isDisabled && selectedDate !== null && d.date > selectedDate);
    if (next) setPickedDate(next.date);
  };

  return (
    <Screen edges={['left', 'right']} testID="choose-slot-screen">
      {rescheduleId ? <Stack.Screen options={{ title: 'Reschedule' }} /> : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {rescheduleId ? <RescheduleBanner appointmentId={rescheduleId} /> : null}
        <ChooseSlotView
          days={days}
          selectedDate={selectedDate}
          onSelectDate={setPickedDate}
          slots={availability.slots}
          timeZone={business.data.timezone}
          liveStatus={liveStatus}
          isLoading={availability.isLoading || selectedDate === null}
          error={availability.error}
          onRetry={() => void availability.refetch()}
          onNextDay={goToNextDay}
          onSelectSlot={(slot) =>
            router.push({
              pathname: '/book/confirm',
              params: {
                serviceId,
                professionalId,
                start: slot.start.toISOString(),
                ...(rescheduleId ? { rescheduleId } : {}),
              },
            })
          }
        />
      </ScrollView>
    </Screen>
  );
}
