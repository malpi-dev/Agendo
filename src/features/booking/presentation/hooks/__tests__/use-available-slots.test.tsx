import { waitFor } from '@testing-library/react-native';

import { FIXED_NOW } from '@/features/demo/data/__tests__/test-db';
import { PROFESSIONAL_IDS, SERVICE_IDS } from '@/features/demo/data/fixtures';
import { renderHookWithProviders } from '@/test/render-with-providers';

import { getAvailableSlots } from '../../../domain/get-available-slots';
import { useBookAppointment } from '../use-book-appointment';
import { useAvailableSlots } from '../use-available-slots';

// The hook reads the clock; pin it to the same instant as the mock database.
jest.mock('@/core/time/use-now', () => ({
  useNow: () => jest.requireActual('@/features/demo/data/__tests__/test-db').FIXED_NOW,
}));

const LENA = PROFESSIONAL_IDS.lena;
const input = { serviceId: SERVICE_IDS.classicHaircut, professionalId: LENA, date: '2026-09-29' };

describe('useAvailableSlots', () => {
  it('returns the same slots as the domain use case', async () => {
    const { result, db } = await renderHookWithProviders(() => useAvailableSlots(input));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const expected = getAvailableSlots({
      date: input.date,
      service: { durationMinutes: 30 },
      workingHours: db.workingHours.filter((h) => h.professionalId === LENA),
      busyRanges: db.appointments.filter((a) => a.professionalId === LENA && a.status === 'booked'),
      business: db.business,
      now: FIXED_NOW,
    });
    expect(result.current.slots.length).toBeGreaterThan(0);
    expect(result.current.slots.map((s) => s.start.getTime())).toEqual(
      expected.map((s) => s.start.getTime()),
    );
  });

  it('drops a slot after it is booked and the busy ranges are invalidated', async () => {
    const { result, queryClient } = await renderHookWithProviders(() => ({
      availability: useAvailableSlots(input),
      book: useBookAppointment(),
    }));
    await waitFor(() => expect(result.current.availability.isLoading).toBe(false));
    const first = result.current.availability.slots[0];
    if (!first) throw new Error('no slots');

    result.current.book.mutate({
      serviceId: input.serviceId,
      professionalId: LENA,
      start: first.start,
    });
    await waitFor(() => expect(result.current.book.isSuccess).toBe(true));
    await waitFor(() =>
      expect(
        result.current.availability.slots.some((s) => s.start.getTime() === first.start.getTime()),
      ).toBe(false),
    );
    expect(queryClient.isFetching()).toBe(0);
  });

  it('is loading until the date is known', async () => {
    const { result } = await renderHookWithProviders(() =>
      useAvailableSlots({ ...input, date: null }),
    );
    expect(result.current.slots).toEqual([]);
  });
});
