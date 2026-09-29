import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { addDaysToLocalDate, formatLongDate, toLocalDate, zonedInstant } from '@/core/time';
import { useNow } from '@/core/time/use-now';
import { AppText, EmptyState, ErrorState, Screen, Skeleton } from '@/core/ui';
import { useCurrentUser } from '@/features/auth/presentation/hooks/use-current-user';
import { LiveIndicator } from '@/features/booking/presentation/components/live-indicator';
import { useBusiness } from '@/features/catalog/presentation/hooks/use-business';
import { useProfessionals } from '@/features/catalog/presentation/hooks/use-professionals';

import { AgendaRow } from '../components/agenda-row';
import { ProfessionalFilter } from '../components/professional-filter';
import { useAgenda } from '../hooks/use-agenda';
import { useAgendaSubscription } from '../hooks/use-agenda-subscription';

export default function AgendaScreen() {
  const user = useCurrentUser();
  if (user?.role !== 'admin') return <Redirect href="/" />;
  return <AdminAgenda />;
}

function AdminAgenda() {
  const business = useBusiness();
  const now = useNow();
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | undefined>();
  const professionals = useProfessionals();
  const liveStatus = useAgendaSubscription();

  const timeZone = business.data?.timezone;
  const today = timeZone ? toLocalDate(now, timeZone) : null;
  const date = pickedDate ?? today;

  return (
    <Screen edges={['left', 'right']} className="gap-4 pt-4" testID="agenda-screen">
      {business.isError ? (
        <ErrorState
          error={business.error}
          onRetry={() => void business.refetch()}
          testID="agenda-error"
        />
      ) : !timeZone || !date ? (
        <AgendaSkeleton />
      ) : (
        <AgendaBody
          date={date}
          today={today ?? date}
          timeZone={timeZone}
          professionalId={professionalId}
          onSelectProfessional={setProfessionalId}
          onSelectDate={setPickedDate}
          professionals={professionals.data ?? []}
          liveStatus={liveStatus}
        />
      )}
    </Screen>
  );
}

interface AgendaBodyProps {
  date: string;
  today: string;
  timeZone: string;
  professionalId?: string;
  onSelectProfessional: (id?: string) => void;
  onSelectDate: (date: string) => void;
  professionals: React.ComponentProps<typeof ProfessionalFilter>['professionals'];
  liveStatus: ReturnType<typeof useAgendaSubscription>;
}

function AgendaBody({
  date,
  today,
  timeZone,
  professionalId,
  onSelectProfessional,
  onSelectDate,
  professionals,
  liveStatus,
}: AgendaBodyProps) {
  const agenda = useAgenda(date, professionalId);
  // Noon avoids any DST edge when formatting the day label.
  const label = formatLongDate(zonedInstant(date, '12:00', timeZone), timeZone);

  return (
    <>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          <DayButton
            testID="agenda-prev-day"
            label="Previous day"
            glyph="‹"
            onPress={() => onSelectDate(addDaysToLocalDate(date, -1))}
          />
          <AppText variant="subtitle" testID="agenda-date" className="min-w-40 text-center">
            {label}
          </AppText>
          <DayButton
            testID="agenda-next-day"
            label="Next day"
            glyph="›"
            onPress={() => onSelectDate(addDaysToLocalDate(date, 1))}
          />
        </View>
        {date !== today ? (
          <Pressable
            testID="agenda-today"
            accessibilityRole="button"
            onPress={() => onSelectDate(today)}
            className="rounded-full border border-border px-3 py-1.5 active:opacity-80"
          >
            <AppText variant="label">Today</AppText>
          </Pressable>
        ) : null}
      </View>
      <LiveIndicator status={liveStatus} />
      <ProfessionalFilter
        professionals={professionals}
        selectedId={professionalId}
        onSelect={onSelectProfessional}
      />
      {agenda.isPending ? (
        <AgendaSkeleton />
      ) : agenda.isError ? (
        <ErrorState
          error={agenda.error}
          onRetry={() => void agenda.refetch()}
          testID="agenda-error"
        />
      ) : agenda.groups.length === 0 ? (
        <EmptyState title="No appointments for this day" testID="agenda-empty" />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={agenda.isRefetching}
              onRefresh={() => void agenda.refetch()}
            />
          }
        >
          {agenda.groups.map((group) => (
            <View
              key={group.professionalId}
              testID={`agenda-group-${group.professionalId}`}
              className="gap-2"
            >
              <AppText variant="subtitle" accessibilityRole="header">
                {group.professionalName}
              </AppText>
              {group.appointments.map((a) => (
                <AgendaRow key={a.id} appointment={a} timeZone={timeZone} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </>
  );
}

function DayButton({
  glyph,
  label,
  onPress,
  testID,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full active:bg-surface"
    >
      <AppText variant="title">{glyph}</AppText>
    </Pressable>
  );
}

function AgendaSkeleton() {
  return (
    <View className="gap-5" testID="agenda-loading">
      {[0, 1].map((i) => (
        <View key={i} className="gap-2">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </View>
      ))}
    </View>
  );
}
