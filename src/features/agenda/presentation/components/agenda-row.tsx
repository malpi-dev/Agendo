import { View } from 'react-native';

import { formatTime } from '@/core/time';
import { AppText } from '@/core/ui';
import type { Appointment } from '@/features/appointments/domain/appointment';

interface AgendaRowProps {
  appointment: Appointment;
  timeZone: string;
}

export function AgendaRow({ appointment, timeZone }: AgendaRowProps) {
  return (
    <View
      testID={`agenda-row-${appointment.id}`}
      className="flex-row gap-3 rounded-2xl border border-border bg-surface p-3"
    >
      <View className="w-1.5 rounded-full bg-primary" />
      <View className="flex-1 gap-0.5">
        <AppText variant="label" tabular>
          {formatTime(appointment.start, timeZone)} – {formatTime(appointment.end, timeZone)}
        </AppText>
        <AppText>{appointment.clientName ?? 'Client'}</AppText>
        <AppText tone="muted">{appointment.serviceName}</AppText>
      </View>
    </View>
  );
}
