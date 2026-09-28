import { AppText } from '@/core/ui';

import type { ModifyDecision } from '../../domain/can-modify-appointment';

type BlockedReason = Extract<ModifyDecision, { allowed: false }>['reason'];

export function modifyNoticeMessage(reason: BlockedReason, cancelLimitHours: number): string {
  switch (reason) {
    case 'windowClosed':
      return `Changes are allowed up to ${cancelLimitHours} hours before the appointment.`;
    case 'alreadyStarted':
      return 'This appointment has already started.';
    case 'notBooked':
      return 'This appointment was cancelled.';
  }
}

export function ModifyNotice({
  reason,
  cancelLimitHours,
}: {
  reason: BlockedReason;
  cancelLimitHours: number;
}) {
  return (
    <AppText tone="muted" testID="modify-notice" accessibilityLiveRegion="polite">
      {modifyNoticeMessage(reason, cancelLimitHours)}
    </AppText>
  );
}
