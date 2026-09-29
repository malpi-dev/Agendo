import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DomainError } from '@/core/errors';
import { at } from '@/features/booking/domain/__tests__/test-fixtures';
import { MockBookingRepository } from '@/features/booking/data/mock-booking-repository';
import { FIXED_NOW, makeDb } from '@/features/demo/data/__tests__/test-db';
import { PROFESSIONAL_IDS, SERVICE_IDS } from '@/features/demo/data/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';

import type { BookingRepository } from '../../../domain/booking-repository';
import { ConfirmBookingContent } from '../confirm-booking-content';

const props = {
  serviceId: SERVICE_IDS.classicHaircut,
  professionalId: PROFESSIONAL_IDS.lena,
  start: at('2026-09-29', '09:00'),
};

const failingBooking = (
  code: 'slotUnavailable' | 'clientOverlap' | 'network' | 'cancellationWindowClosed',
): BookingRepository => ({
  ...new MockBookingRepository(makeDb()),
  getBusyRanges: async () => [],
  book: async () => {
    throw new DomainError(code);
  },
  reschedule: async () => {
    throw new DomainError(code);
  },
  subscribeToAvailability: () => () => undefined,
});

describe('ConfirmBookingContent', () => {
  it('shows the summary and calls onBooked with the new appointment', async () => {
    const onBooked = jest.fn();
    await renderWithProviders(
      <ConfirmBookingContent {...props} onBooked={onBooked} onConflict={jest.fn()} />,
    );
    await waitFor(() => expect(screen.getByTestId('booking-summary')).toBeTruthy());
    expect(screen.getByText('Classic haircut')).toBeTruthy();
    expect(screen.getByText('$20.00')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('confirm-booking-button'));
    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1));
    expect(onBooked.mock.calls[0]?.[0]).toMatchObject({
      status: 'booked',
      professionalId: PROFESSIONAL_IDS.lena,
    });
  });

  it('calls onConflict when the slot was just taken', async () => {
    const onConflict = jest.fn();
    const onBooked = jest.fn();
    const { queryClient } = await renderWithProviders(
      <ConfirmBookingContent {...props} onBooked={onBooked} onConflict={onConflict} />,
      {
        repositories: { booking: failingBooking('slotUnavailable') },
      },
    );
    await waitFor(() => expect(screen.getByTestId('confirm-booking-button')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('confirm-booking-button'));
    await waitFor(() => expect(onConflict).toHaveBeenCalledTimes(1));
    // Let the mutation state and the invalidation refetches settle inside the test.
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    await waitFor(() =>
      expect(screen.getByTestId('confirm-booking-button').props.accessibilityState.busy).toBe(
        false,
      ),
    );
    // Flush TanStack Query's batched notifications (setTimeout 0) while still inside act().
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(onBooked).not.toHaveBeenCalled();
  });

  it('shows an inline message for clientOverlap and keeps the button usable', async () => {
    await renderWithProviders(
      <ConfirmBookingContent {...props} onBooked={jest.fn()} onConflict={jest.fn()} />,
      {
        repositories: { booking: failingBooking('clientOverlap') },
      },
    );
    await waitFor(() => expect(screen.getByTestId('confirm-booking-button')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('confirm-booking-button'));
    await waitFor(() =>
      expect(screen.getByText('You already have an appointment at that time.')).toBeTruthy(),
    );
    expect(screen.getByTestId('confirm-booking-button').props.accessibilityState.disabled).toBe(
      false,
    );
  });

  it('shows the generic message for other errors', async () => {
    await renderWithProviders(
      <ConfirmBookingContent {...props} onBooked={jest.fn()} onConflict={jest.fn()} />,
      {
        repositories: { booking: failingBooking('network') },
      },
    );
    await waitFor(() => expect(screen.getByTestId('confirm-booking-button')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('confirm-booking-button'));
    await waitFor(() =>
      expect(screen.getByText('Check your connection and try again.')).toBeTruthy(),
    );
  });

  it('shows an error state when the professional cannot be loaded', async () => {
    await renderWithProviders(
      <ConfirmBookingContent
        {...props}
        professionalId="nope"
        onBooked={jest.fn()}
        onConflict={jest.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('confirm-error')).toBeTruthy());
  });

  describe('rescheduling', () => {
    it('shows Before → After and calls reschedule instead of book', async () => {
      const db = makeDb();
      const casey = db.appointments.find(
        (a) => a.clientId === db.currentUser.id && a.status === 'booked' && a.start > FIXED_NOW,
      );
      if (!casey) throw new Error('fixture missing');
      const onRescheduled = jest.fn();
      const onBooked = jest.fn();
      await renderWithProviders(
        <ConfirmBookingContent
          serviceId={casey.serviceId}
          professionalId={casey.professionalId}
          start={new Date(casey.start.getTime() + 24 * 3_600_000)}
          rescheduleId={casey.id}
          onBooked={onBooked}
          onConflict={jest.fn()}
          onRescheduled={onRescheduled}
        />,
        { db },
      );
      await waitFor(() => expect(screen.getByTestId('reschedule-before')).toBeTruthy());
      expect(screen.getByTestId('reschedule-after')).toBeTruthy();
      expect(screen.getByText('Confirm new time')).toBeTruthy();

      const originalStart = casey.start.getTime();
      await fireEvent.press(screen.getByTestId('confirm-booking-button'));
      await waitFor(() => expect(onRescheduled).toHaveBeenCalledTimes(1));
      expect(onBooked).not.toHaveBeenCalled();
      expect(onRescheduled.mock.calls[0]?.[0]).toMatchObject({ id: casey.id });
      expect(db.appointments.find((a) => a.id === casey.id)?.start.getTime()).not.toBe(
        originalStart,
      );
    });

    it('offers to go back when the change window has closed', async () => {
      const onBack = jest.fn();
      const db = makeDb();
      const casey = db.appointments.find((a) => a.clientId === db.currentUser.id);
      if (!casey) throw new Error('fixture missing');
      await renderWithProviders(
        <ConfirmBookingContent
          {...props}
          rescheduleId={casey.id}
          onBooked={jest.fn()}
          onConflict={jest.fn()}
          onRescheduled={jest.fn()}
          onBackToAppointment={onBack}
        />,
        { db, repositories: { booking: failingBooking('cancellationWindowClosed') } },
      );
      await waitFor(() => expect(screen.getByTestId('confirm-booking-button')).toBeTruthy());
      await fireEvent.press(screen.getByTestId('confirm-booking-button'));
      await waitFor(() => expect(screen.getByTestId('back-to-appointment-button')).toBeTruthy());
      expect(screen.getByTestId('confirm-inline-error')).toBeTruthy();
      await fireEvent.press(screen.getByTestId('back-to-appointment-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });
});
