import { at } from '@/features/booking/domain/__tests__/test-fixtures';
import { makeDb, FIXED_NOW } from '@/features/demo/data/__tests__/test-db';
import { DEMO_USER_ID, PROFESSIONAL_IDS, SERVICE_IDS } from '@/features/demo/data/fixtures';
import { MockAppointmentsRepository } from '@/features/appointments/data/mock-appointments-repository';
import { splitAppointments } from '@/features/appointments/domain/split-appointments';

import { MockBookingRepository } from '../mock-booking-repository';

const LENA = PROFESSIONAL_IDS.lena;
const MARCO = PROFESSIONAL_IDS.marco;
const CLASSIC = SERVICE_IDS.classicHaircut;

const setup = (options = {}) => {
  const db = makeDb(options);
  return { db, booking: new MockBookingRepository(db), mine: new MockAppointmentsRepository(db) };
};

describe('MockBookingRepository.book', () => {
  it('books a valid slot for the current user', async () => {
    const { booking, mine } = setup();
    const created = await booking.book({
      serviceId: CLASSIC,
      professionalId: LENA,
      start: at('2026-09-29', '09:00'),
    });
    expect(created.clientId).toBe(DEMO_USER_ID);
    expect(created.status).toBe('booked');
    expect((await mine.listMine()).some((a) => a.id === created.id)).toBe(true);
  });

  it('rejects an occupied slot with slotUnavailable', async () => {
    const { booking } = setup();
    await expect(
      booking.book({ serviceId: CLASSIC, professionalId: LENA, start: at('2026-09-29', '11:00') }),
    ).rejects.toMatchObject({ code: 'slotUnavailable' });
  });

  it('rejects overlapping own appointments with clientOverlap', async () => {
    const { booking } = setup();
    await booking.book({
      serviceId: CLASSIC,
      professionalId: LENA,
      start: at('2026-09-29', '09:00'),
    });
    await expect(
      booking.book({ serviceId: CLASSIC, professionalId: MARCO, start: at('2026-09-29', '09:15') }),
    ).rejects.toMatchObject({ code: 'clientOverlap' });
  });

  it.each([
    ['Sunday', '2026-10-04', '10:00'],
    ['after closing', '2026-09-30', '20:00'],
    ['off the slot grid', '2026-09-30', '09:07'],
    ['across the lunch break', '2026-09-30', '12:45'],
  ])('rejects %s with outsideWorkingHours', async (_label, date, time) => {
    const { booking } = setup();
    await expect(
      booking.book({
        serviceId: SERVICE_IDS.skinFade,
        professionalId: MARCO,
        start: at(date, time),
      }),
    ).rejects.toMatchObject({ code: 'outsideWorkingHours' });
  });

  it('rejects starts inside the minimum notice', async () => {
    const { booking } = setup();
    await expect(
      booking.book({ serviceId: CLASSIC, professionalId: LENA, start: at('2026-09-29', '08:30') }),
    ).rejects.toMatchObject({ code: 'bookingWindow' });
  });

  it('rejects dates beyond the advance window', async () => {
    const { booking } = setup();
    await expect(
      booking.book({ serviceId: CLASSIC, professionalId: LENA, start: at('2026-10-29', '10:00') }),
    ).rejects.toMatchObject({ code: 'bookingWindow' });
  });

  it('validates service and professional', async () => {
    const { booking } = setup();
    const start = at('2026-09-30', '10:00');
    await expect(
      booking.book({ serviceId: 'x', professionalId: LENA, start }),
    ).rejects.toMatchObject({ code: 'notFound' });
    await expect(
      booking.book({ serviceId: SERVICE_IDS.hotTowelShave, professionalId: LENA, start }),
    ).rejects.toMatchObject({ code: 'validation' });
  });
});

describe('MockBookingRepository.reschedule', () => {
  const upcomingId = async (mine: MockAppointmentsRepository) => {
    const { upcoming } = splitAppointments(await mine.listMine(), FIXED_NOW);
    const first = upcoming[0];
    if (!first) throw new Error('no upcoming appointment');
    return first;
  };

  it('moves to a free slot keeping the id', async () => {
    const { booking, mine } = setup();
    const original = await upcomingId(mine);
    const newStart = new Date(original.start.getTime() - 60 * 60_000); // one hour earlier, same day
    const moved = await booking.reschedule(original.id, newStart);
    expect(moved.id).toBe(original.id);
    expect(moved.start.getTime()).toBe(newStart.getTime());
  });

  it('rejects an occupied slot and leaves the appointment unchanged', async () => {
    const { db, booking, mine } = setup();
    const original = await upcomingId(mine);
    const occupied = db.appointments.find(
      (a) =>
        a.status === 'booked' &&
        a.clientId !== DEMO_USER_ID &&
        a.professionalId === original.professionalId &&
        a.start.getTime() > FIXED_NOW.getTime() + 3_600_000,
    );
    if (!occupied) throw new Error('no occupied slot');
    await expect(booking.reschedule(original.id, occupied.start)).rejects.toMatchObject({
      code: 'slotUnavailable',
    });
    expect((await mine.getById(original.id)).start.getTime()).toBe(original.start.getTime());
  });

  it('rejects appointments of other users with notFound', async () => {
    const { db, booking } = setup();
    const other = db.appointments.find((a) => a.clientId !== DEMO_USER_ID && a.status === 'booked');
    await expect(
      booking.reschedule(other?.id ?? '', at('2026-10-01', '10:00')),
    ).rejects.toMatchObject({
      code: 'notFound',
    });
  });

  it('rejects past appointments', async () => {
    const { db, booking } = setup();
    const past = db.appointments.find(
      (a) => a.clientId === DEMO_USER_ID && a.status === 'booked' && a.start < FIXED_NOW,
    );
    await expect(
      booking.reschedule(past?.id ?? '', at('2026-10-01', '10:00')),
    ).rejects.toMatchObject({
      code: 'cancellationWindowClosed',
    });
  });
});

describe('MockBookingRepository.getBusyRanges', () => {
  it('returns booked ranges only and excludes cancelled ones', async () => {
    const { db, booking } = setup();
    const cancelled = db.appointments.find(
      (a) => a.status === 'cancelled' && a.clientId !== DEMO_USER_ID,
    );
    if (!cancelled) throw new Error('no cancelled appointment');
    const ranges = await booking.getBusyRanges(
      cancelled.professionalId,
      new Date(cancelled.start.getTime() - 3_600_000),
      new Date(cancelled.end.getTime() + 3_600_000),
    );
    expect(ranges.some((r) => r.start.getTime() === cancelled.start.getTime())).toBe(false);
    expect(Object.keys(ranges[0] ?? { start: 0, end: 0 }).sort()).toEqual(['end', 'start']);
  });

  it('includes booked appointments overlapping the window', async () => {
    const { booking } = setup();
    const ranges = await booking.getBusyRanges(
      LENA,
      at('2026-09-29', '00:00'),
      at('2026-09-30', '00:00'),
    );
    expect(ranges.map((r) => r.start.getTime())).toContain(at('2026-09-29', '11:00').getTime());
  });
});

describe('MockBookingRepository.subscribeToAvailability', () => {
  it('notifies on changes of that professional until unsubscribed', async () => {
    const { booking } = setup();
    const onChange = jest.fn();
    const onStatus = jest.fn();
    const off = booking.subscribeToAvailability(LENA, onChange, onStatus);
    expect(onStatus).toHaveBeenCalledWith('live');

    await booking.book({
      serviceId: CLASSIC,
      professionalId: LENA,
      start: at('2026-09-29', '09:00'),
    });
    expect(onChange).toHaveBeenCalledTimes(1);

    await booking.book({
      serviceId: CLASSIC,
      professionalId: MARCO,
      start: at('2026-09-30', '09:00'),
    });
    expect(onChange).toHaveBeenCalledTimes(1); // other professional

    off();
    await booking.book({
      serviceId: CLASSIC,
      professionalId: LENA,
      start: at('2026-09-29', '09:30'),
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  describe('concurrent booking simulation', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('books a slot for someone else after 5 s, once per session', async () => {
      const { db, booking } = setup({ simulateConcurrentBooking: true });
      const bookedBefore = db.appointments.filter(
        (a) => a.professionalId === LENA && a.status === 'booked',
      ).length;
      await booking.getBusyRanges(LENA, at('2026-09-29', '00:00'), at('2026-09-30', '00:00'));

      const onChange = jest.fn();
      booking.subscribeToAvailability(LENA, onChange);
      jest.advanceTimersByTime(4999);
      expect(onChange).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(
        db.appointments.filter((a) => a.professionalId === LENA && a.status === 'booked'),
      ).toHaveLength(bookedBefore + 1);
      expect(db.concurrentBookingSimulated).toBe(true);

      booking.subscribeToAvailability(LENA, onChange); // second subscription: nothing scheduled
      jest.advanceTimersByTime(10_000);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('does nothing if unsubscribed before the timer fires', async () => {
      const { db, booking } = setup({ simulateConcurrentBooking: true });
      await booking.getBusyRanges(LENA, at('2026-09-29', '00:00'), at('2026-09-30', '00:00'));
      const off = booking.subscribeToAvailability(LENA, jest.fn());
      off();
      jest.advanceTimersByTime(6000);
      expect(db.concurrentBookingSimulated).toBe(false);
    });
  });
});
