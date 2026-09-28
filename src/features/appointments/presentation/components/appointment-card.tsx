import { Pressable, View } from 'react-native';

import { formatLongDate, formatTime } from '@/core/time';
import { AppText, Badge, type BadgeTone } from '@/core/ui';

import type { Appointment } from '../../domain/appointment';

type Kind = 'upcoming' | 'past' | 'cancelled';

const KIND: Record<Kind, { label: string; tone: BadgeTone; bar: string }> = {
  upcoming: { label: 'Upcoming', tone: 'success', bar: 'bg-primary' },
  past: { label: 'Completed', tone: 'muted', bar: 'bg-text-muted' },
  cancelled: { label: 'Cancelled', tone: 'danger', bar: 'bg-danger' },
};

function kindOf(appointment: Appointment, now: Date): Kind {
  if (appointment.status === 'cancelled') return 'cancelled';
  if (appointment.status === 'booked' && appointment.end > now) return 'upcoming';
  return 'past';
}

interface AppointmentCardProps {
  appointment: Appointment;
  timeZone: string;
  now: Date;
  onPress: (appointment: Appointment) => void;
}

export function AppointmentCard({ appointment, timeZone, now, onPress }: AppointmentCardProps) {
  const { label, tone, bar } = KIND[kindOf(appointment, now)];
  return (
    <Pressable
      testID={`appointment-card-${appointment.id}`}
      accessibilityRole="button"
      onPress={() => onPress(appointment)}
      className="flex-row overflow-hidden rounded-2xl border border-border bg-surface active:opacity-80"
    >
      <View className={`w-1.5 ${bar}`} />
      <View className="flex-1 gap-1 p-4">
        <View className="flex-row items-center justify-between gap-2">
          <AppText variant="subtitle" className="flex-shrink">
            {appointment.serviceName}
          </AppText>
          <Badge label={label} tone={tone} />
        </View>
        <AppText tone="muted">with {appointment.professionalName}</AppText>
        <AppText variant="label" tabular>
          {formatLongDate(appointment.start, timeZone)} · {formatTime(appointment.start, timeZone)}
        </AppText>
      </View>
    </Pressable>
  );
}
