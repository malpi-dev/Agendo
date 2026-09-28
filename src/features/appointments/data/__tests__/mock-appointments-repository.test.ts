import { makeDb, FIXED_NOW } from '@/features/demo/data/__tests__/test-db';
import { DEMO_USER_ID } from '@/features/demo/data/fixtures';

import { splitAppointments } from '../../domain/split-appointments';
import { MockAppointmentsRepository } from '../mock-appointments-repository';

describe('MockAppointmentsRepository', () => {
  it('lists only the current user’s appointments', async () => {
    const repo = new MockAppointmentsRepository(makeDb());
    const mine = await repo.listMine();
    expect(mine).toHaveLength(5);
    expect(mine.every((a) => a.clientId === DEMO_USER_ID)).toBe(true);
  });

  it('cancels an upcoming appointment, sets cancelledAt and emits an event', async () => {
    const db = makeDb();
    const repo = new MockAppointmentsRepository(db);
    const listener = jest.fn();
    db.on(listener);
    const { upcoming } = splitAppointments(await repo.listMine(), FIXED_NOW);
    const target = upcoming[0];
    if (!target) throw new Error('no upcoming appointment');

    await repo.cancel(target.id);
    const after = await repo.getById(target.id);
    expect(after.status).toBe('cancelled');
    expect(after.cancelledAt).toEqual(FIXED_NOW);
    expect(listener).toHaveBeenCalledWith({
      type: 'appointmentChanged',
      professionalId: target.professionalId,
    });
  });

  it('rejects cancelling inside the window or after start with cancellationWindowClosed', async () => {
    const db = makeDb();
    const repo = new MockAppointmentsRepository(db);
    const past = db.appointments.find(
      (a) => a.clientId === DEMO_USER_ID && a.status === 'booked' && a.start < FIXED_NOW,
    );
    await expect(repo.cancel(past?.id ?? '')).rejects.toMatchObject({
      code: 'cancellationWindowClosed',
    });

    const soon = db.appointments.find(
      (a) => a.clientId === DEMO_USER_ID && a.status === 'booked' && a.start > FIXED_NOW,
    );
    if (!soon) throw new Error('no upcoming appointment');
    soon.start = new Date(FIXED_NOW.getTime() + 90 * 60_000);
    await expect(repo.cancel(soon.id)).rejects.toMatchObject({ code: 'cancellationWindowClosed' });
  });

  it('rejects cancelling an already cancelled appointment with validation', async () => {
    const db = makeDb();
    const repo = new MockAppointmentsRepository(db);
    const cancelled = db.appointments.find(
      (a) => a.clientId === DEMO_USER_ID && a.status === 'cancelled',
    );
    await expect(repo.cancel(cancelled?.id ?? '')).rejects.toMatchObject({ code: 'validation' });
  });

  it('hides other users’ appointments except from admins', async () => {
    const db = makeDb();
    const repo = new MockAppointmentsRepository(db);
    const other = db.appointments.find((a) => a.clientId !== DEMO_USER_ID);
    await expect(repo.getById(other?.id ?? '')).rejects.toMatchObject({ code: 'notFound' });
    db.currentUser.role = 'admin';
    await expect(repo.getById(other?.id ?? '')).resolves.toMatchObject({ id: other?.id });
  });

  it('returns copies', async () => {
    const repo = new MockAppointmentsRepository(makeDb());
    const [first] = await repo.listMine();
    if (first) first.status = 'completed';
    expect((await repo.listMine())[0]?.status).not.toBe('completed');
  });
});
