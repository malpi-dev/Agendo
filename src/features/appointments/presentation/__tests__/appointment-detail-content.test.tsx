import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { makeDb } from '@/features/demo/data/__tests__/test-db';
import { DEMO_USER_ID } from '@/features/demo/data/fixtures';
import type { MockDb } from '@/features/demo/data/mock-db';
import { renderWithProviders } from '@/test/render-with-providers';

import type { Appointment } from '../../domain/appointment';
import { AppointmentDetailContent } from '../components/appointment-detail-content';

// Screens render cold on CI; give the first render extra room.
jest.setTimeout(30_000);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const HOUR = 3_600_000;

function dbWithAppointment(startsInMs: number, overrides: Partial<Appointment> = {}) {
  const db = makeDb({ now: () => new Date() });
  const template = db.appointments.find(
    (a) => a.clientId === DEMO_USER_ID && a.status === 'booked',
  );
  if (!template) throw new Error('fixture missing');
  const start = new Date(Date.now() + startsInMs);
  const appointment: Appointment = {
    ...template,
    id: 'test-appt',
    start,
    end: new Date(start.getTime() + 30 * 60_000),
    status: 'booked',
    ...overrides,
  };
  db.appointments.push(appointment);
  return { db, appointment };
}

const disabled = (testID: string) =>
  screen.getByTestId(testID).props.accessibilityState.disabled as boolean;

const renderDetail = (db: MockDb, id = 'test-appt') =>
  renderWithProviders(<AppointmentDetailContent id={id} />, { db });

describe('AppointmentDetailContent', () => {
  it('disables both actions with an explanation inside the change window', async () => {
    const { db } = dbWithAppointment(HOUR);
    await renderDetail(db);
    await waitFor(() => expect(screen.getByTestId('appointment-detail')).toBeTruthy());
    expect(disabled('reschedule-appointment-button')).toBe(true);
    expect(disabled('cancel-appointment-button')).toBe(true);
    expect(
      screen.getByText('Changes are allowed up to 2 hours before the appointment.'),
    ).toBeTruthy();
  });

  it('enables both actions for an appointment 3 days away', async () => {
    const { db } = dbWithAppointment(72 * HOUR);
    await renderDetail(db);
    await waitFor(() => expect(screen.getByTestId('appointment-detail')).toBeTruthy());
    expect(disabled('reschedule-appointment-button')).toBe(false);
    expect(disabled('cancel-appointment-button')).toBe(false);
    expect(screen.queryByTestId('modify-notice')).toBeNull();
  });

  it('shows no actions for a cancelled appointment', async () => {
    const { db } = dbWithAppointment(72 * HOUR, { status: 'cancelled', cancelledAt: new Date() });
    await renderDetail(db);
    await waitFor(() => expect(screen.getByTestId('appointment-detail')).toBeTruthy());
    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(screen.queryByTestId('cancel-appointment-button')).toBeNull();
    expect(screen.queryByTestId('reschedule-appointment-button')).toBeNull();
  });

  it('cancels through the repository after confirmation and shows the cancelled state', async () => {
    const { db } = dbWithAppointment(72 * HOUR);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderDetail(db);
    await waitFor(() => expect(screen.getByTestId('cancel-appointment-button')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('cancel-appointment-button'));
    expect(alert).toHaveBeenCalledWith(
      'Cancel appointment?',
      'This frees the time for other clients.',
      expect.any(Array),
    );
    expect(db.appointments.find((a) => a.id === 'test-appt')?.status).toBe('booked');

    const buttons = alert.mock.calls[0]?.[2] ?? [];
    buttons.find((b) => b.style === 'destructive')?.onPress?.();

    await waitFor(() => expect(screen.getByText('Cancelled')).toBeTruthy());
    expect(db.appointments.find((a) => a.id === 'test-appt')?.status).toBe('cancelled');
    expect(screen.queryByTestId('cancel-appointment-button')).toBeNull();
    alert.mockRestore();
  });

  it('shows the not-found state for an unknown appointment', async () => {
    await renderDetail(makeDb(), 'nope');
    await waitFor(() => expect(screen.getByTestId('appointment-not-found')).toBeTruthy());
    expect(screen.getByText('This appointment no longer exists')).toBeTruthy();
    expect(screen.getByTestId('back-to-appointments-button')).toBeTruthy();
  });
});
