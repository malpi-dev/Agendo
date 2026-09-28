import { Badge, type BadgeTone } from '@/core/ui';

import type { AppointmentStatus } from '../../domain/appointment';

const CONFIG: Record<AppointmentStatus, { label: string; tone: BadgeTone }> = {
  booked: { label: 'Booked', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  completed: { label: 'Completed', tone: 'muted' },
  no_show: { label: 'No show', tone: 'warning' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, tone } = CONFIG[status];
  return <Badge label={label} tone={tone} testID={`status-badge-${status}`} />;
}
