import { screen, waitFor } from '@testing-library/react-native';

import { DomainError } from '@/core/errors';
import { makeDb } from '@/features/demo/data/__tests__/test-db';
import { DEMO_USER_ID } from '@/features/demo/data/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';

import { MockAppointmentsRepository } from '../../data/mock-appointments-repository';
import { splitAppointments } from '../../domain/split-appointments';
import AppointmentsScreen from '../screens/appointments-screen';

// Screens render cold on CI; give the first render extra room.
jest.setTimeout(30_000);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const realClockDb = () => makeDb({ now: () => new Date() });

describe('AppointmentsScreen', () => {
  it('shows Casey’s appointments in the right sections and order', async () => {
    const db = realClockDb();
    await renderWithProviders(<AppointmentsScreen />, { db });
    await waitFor(() => expect(screen.getByText('Past & cancelled')).toBeTruthy());

    const { upcoming, past } = splitAppointments(
      db.appointments.filter((a) => a.clientId === DEMO_USER_ID),
      new Date(),
    );
    expect(upcoming).toHaveLength(2);
    expect(past).toHaveLength(3);

    const rendered = screen
      .getAllByTestId(/^appointment-card-/)
      .map((node) => node.props.testID as string);
    expect(rendered).toEqual([...upcoming, ...past].map((a) => `appointment-card-${a.id}`));

    expect(screen.getAllByText('Upcoming')).toHaveLength(3); // header + 2 badges
    expect(screen.getAllByText('Completed')).toHaveLength(2);
    expect(screen.getAllByText('Cancelled')).toHaveLength(1);
  });

  it('shows the empty state with a Book now button when there are none', async () => {
    const db = realClockDb();
    db.appointments = [];
    await renderWithProviders(<AppointmentsScreen />, { db });
    await waitFor(() => expect(screen.getByText('No appointments yet')).toBeTruthy());
    expect(screen.getByTestId('book-now-button')).toBeTruthy();
  });

  it('shows a short note when only one section is empty', async () => {
    const db = realClockDb();
    db.appointments = db.appointments.filter(
      (a) => a.clientId === DEMO_USER_ID && a.start.getTime() < Date.now(),
    );
    await renderWithProviders(<AppointmentsScreen />, { db });
    await waitFor(() => expect(screen.getByText('Nothing upcoming')).toBeTruthy());
  });

  it('shows a loading skeleton first and an error state with retry', async () => {
    const failing = new MockAppointmentsRepository(realClockDb());
    failing.listMine = async () => {
      throw new DomainError('network');
    };
    await renderWithProviders(<AppointmentsScreen />, { repositories: { appointments: failing } });
    await waitFor(() => expect(screen.getByTestId('appointments-error')).toBeTruthy());
    expect(screen.getByText("You're offline")).toBeTruthy();
    expect(screen.getByTestId('appointments-error-retry')).toBeTruthy();
  });
});
