import { toLocalDate } from '@/core/time';
import { makeDb } from '@/features/demo/data/__tests__/test-db';
import { PROFESSIONAL_IDS } from '@/features/demo/data/fixtures';

import { MockAgendaRepository } from '../mock-agenda-repository';

const adminRepo = () => {
  const db = makeDb();
  db.currentUser.role = 'admin';
  return { db, repo: new MockAgendaRepository(db) };
};

describe('MockAgendaRepository', () => {
  it('is forbidden for clients', async () => {
    const repo = new MockAgendaRepository(makeDb());
    await expect(repo.listForDay('2026-09-29')).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('lists today’s booked appointments sorted by start', async () => {
    const { repo } = adminRepo();
    const list = await repo.listForDay('2026-09-29');
    expect(list).toHaveLength(5);
    const starts = list.map((a) => a.start.getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it('uses the business-local day and excludes cancelled appointments', async () => {
    const { db, repo } = adminRepo();
    const list = await repo.listForDay('2026-09-30');
    expect(list.every((a) => toLocalDate(a.start, db.business.timezone) === '2026-09-30')).toBe(
      true,
    );
    expect(list.every((a) => a.status === 'booked')).toBe(true);
  });

  it('filters by professional', async () => {
    const { repo } = adminRepo();
    const list = await repo.listForDay('2026-09-29', PROFESSIONAL_IDS.lena);
    expect(list).toHaveLength(2);
    expect(list.every((a) => a.professionalId === PROFESSIONAL_IDS.lena)).toBe(true);
  });

  it('notifies subscribers of any change', () => {
    const { db, repo } = adminRepo();
    const onChange = jest.fn();
    const onStatus = jest.fn();
    const off = repo.subscribe(onChange, onStatus);
    expect(onStatus).toHaveBeenCalledWith('live');
    db.emit({ type: 'appointmentChanged', professionalId: PROFESSIONAL_IDS.sam });
    expect(onChange).toHaveBeenCalledTimes(1);
    off();
    db.emit({ type: 'appointmentChanged', professionalId: PROFESSIONAL_IDS.sam });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
