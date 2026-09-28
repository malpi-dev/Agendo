import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DomainError } from '@/core/errors';
import { at } from '@/features/booking/domain/__tests__/test-fixtures';
import { MockBookingRepository } from '@/features/booking/data/mock-booking-repository';
import { makeDb } from '@/features/demo/data/__tests__/test-db';
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
  code: 'slotUnavailable' | 'clientOverlap' | 'network',
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
    await renderWithProviders(
      <ConfirmBookingContent {...props} onBooked={onBooked} onConflict={onConflict} />,
      {
        repositories: { booking: failingBooking('slotUnavailable') },
      },
    );
    await waitFor(() => expect(screen.getByTestId('confirm-booking-button')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('confirm-booking-button'));
    await waitFor(() => expect(onConflict).toHaveBeenCalledTimes(1));
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
});
