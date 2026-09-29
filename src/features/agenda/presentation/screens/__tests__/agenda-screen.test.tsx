import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import { FIXED_NOW, makeDb } from '@/features/demo/data/__tests__/test-db';
import { PROFESSIONAL_IDS } from '@/features/demo/data/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';

import type { AgendaRepository } from '../../../domain/agenda-repository';
import AgendaScreen from '../agenda-screen';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
}));

const TIMEOUT = 20_000;
const WAIT = 10_000;

const adminDb = () => {
  const db = makeDb();
  db.currentUser.role = 'admin';
  return db;
};

beforeEach(() => {
  // Only fake the clock: timers stay real so waitFor keeps working.
  jest.useFakeTimers({
    now: FIXED_NOW,
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'nextTick',
      'queueMicrotask',
      'performance',
      'requestAnimationFrame',
      'cancelAnimationFrame',
    ],
  });
  useSessionStore.setState({ mode: 'demo', demoRole: 'admin' });
});

afterEach(() => {
  jest.useRealTimers();
  useSessionStore.setState({ mode: 'demo', demoRole: 'client' });
});

describe('AgendaScreen', () => {
  it(
    'redirects clients away',
    async () => {
      useSessionStore.setState({ demoRole: 'client' });
      await renderWithProviders(<AgendaScreen />, { db: adminDb() });
      expect(screen.getByTestId('redirect')).toBeTruthy();
      expect(screen.queryByTestId('agenda-screen')).toBeNull();
    },
    TIMEOUT,
  );

  it(
    'shows today grouped by professional and sorted by time',
    async () => {
      await renderWithProviders(<AgendaScreen />, { db: adminDb() });
      expect(screen.getByTestId('agenda-loading')).toBeTruthy();
      await waitFor(
        () => expect(screen.getByTestId(`agenda-group-${PROFESSIONAL_IDS.marco}`)).toBeTruthy(),
        { timeout: WAIT },
      );
      expect(screen.getByTestId(`agenda-group-${PROFESSIONAL_IDS.lena}`)).toBeTruthy();
      expect(screen.getByTestId(`agenda-group-${PROFESSIONAL_IDS.sam}`)).toBeTruthy();
      expect(screen.getByText('10:00 AM – 10:30 AM')).toBeTruthy();
      expect(screen.getByTestId('live-indicator')).toBeTruthy();
      expect(screen.queryByTestId('agenda-today')).toBeNull();
    },
    TIMEOUT,
  );

  it(
    'filters by professional',
    async () => {
      await renderWithProviders(<AgendaScreen />, { db: adminDb() });
      await waitFor(() => expect(screen.getByTestId(`agenda-filter-${PROFESSIONAL_IDS.lena}`)), {
        timeout: WAIT,
      });
      await fireEvent.press(screen.getByTestId(`agenda-filter-${PROFESSIONAL_IDS.lena}`));
      await waitFor(
        () => expect(screen.getByTestId(`agenda-group-${PROFESSIONAL_IDS.lena}`)).toBeTruthy(),
        { timeout: WAIT },
      );
      expect(screen.queryByTestId(`agenda-group-${PROFESSIONAL_IDS.marco}`)).toBeNull();
      await fireEvent.press(screen.getByTestId('agenda-filter-all'));
      await waitFor(
        () => expect(screen.getByTestId(`agenda-group-${PROFESSIONAL_IDS.marco}`)).toBeTruthy(),
        { timeout: WAIT },
      );
    },
    TIMEOUT,
  );

  it(
    'navigates between days and back to today; shows the empty state',
    async () => {
      const { queryClient } = await renderWithProviders(<AgendaScreen />, { db: adminDb() });
      await waitFor(() => expect(screen.getByTestId('agenda-date')).toBeTruthy(), {
        timeout: WAIT,
      });
      expect(screen.getByTestId('agenda-date').props.children).toBe('Tuesday, Sep 29');

      await fireEvent.press(screen.getByTestId('agenda-next-day'));
      await waitFor(
        () => expect(screen.getByTestId('agenda-date').props.children).toBe('Wednesday, Sep 30'),
        { timeout: WAIT },
      );
      expect(
        queryClient.getQueryCache().find({ queryKey: ['agenda', '2026-09-30', 'all'] }),
      ).toBeDefined();
      expect(screen.getByTestId('agenda-today')).toBeTruthy();

      // Go far ahead: nothing booked.
      for (let i = 0; i < 40; i++) await fireEvent.press(screen.getByTestId('agenda-next-day'));
      await waitFor(() => expect(screen.getByTestId('agenda-empty')).toBeTruthy(), {
        timeout: WAIT,
      });
      expect(screen.getByText('No appointments for this day')).toBeTruthy();

      await fireEvent.press(screen.getByTestId('agenda-today'));
      await waitFor(
        () => expect(screen.getByTestId('agenda-date').props.children).toBe('Tuesday, Sep 29'),
        { timeout: WAIT },
      );
    },
    TIMEOUT,
  );

  it(
    'shows an error with retry',
    async () => {
      const failing: AgendaRepository = {
        listForDay: jest.fn().mockRejectedValue(new Error('boom')),
        subscribe: () => () => undefined,
      };
      await renderWithProviders(<AgendaScreen />, { repositories: { agenda: failing } });
      await waitFor(() => expect(screen.getByTestId('agenda-error')).toBeTruthy(), {
        timeout: WAIT,
      });
    },
    TIMEOUT,
  );

  it(
    'refreshes when the subscription reports a change',
    async () => {
      const listForDay = jest.fn().mockResolvedValue([]);
      let notify: () => void = () => undefined;
      const agenda: AgendaRepository = {
        listForDay,
        subscribe: (onChange, onStatus) => {
          notify = onChange;
          onStatus?.('live');
          return () => undefined;
        },
      };
      await renderWithProviders(<AgendaScreen />, { repositories: { agenda } });
      await waitFor(() => expect(screen.getByTestId('agenda-empty')).toBeTruthy(), {
        timeout: WAIT,
      });
      expect(listForDay).toHaveBeenCalledTimes(1);
      await act(async () => notify());
      await waitFor(() => expect(listForDay).toHaveBeenCalledTimes(2), { timeout: WAIT });
    },
    TIMEOUT,
  );
});
