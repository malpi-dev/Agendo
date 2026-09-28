import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { DomainError } from '@/core/errors';
import { at } from '@/features/booking/domain/__tests__/test-fixtures';

import type { Slot } from '../../../domain/slot';
import { ChooseSlotView, type ChooseSlotViewProps } from '../choose-slot-view';

const slot = (time: string): Slot => ({
  start: at('2026-10-01', time),
  end: at(
    '2026-10-01',
    time.replace(
      /^(\d\d):(\d\d)$/,
      (_m, h, m) => `${h}:${String(Number(m) + 30).padStart(2, '0')}`,
    ),
  ),
});

const base: ChooseSlotViewProps = {
  days: [
    { date: '2026-09-30', isDisabled: false },
    { date: '2026-10-01', isDisabled: false },
    { date: '2026-10-04', isDisabled: true },
  ],
  selectedDate: '2026-10-01',
  onSelectDate: jest.fn(),
  slots: [slot('09:00'), slot('09:15'), slot('09:30')],
  timeZone: 'America/Mexico_City',
  liveStatus: 'live',
  isLoading: false,
  error: null,
  onRetry: jest.fn(),
  onSelectSlot: jest.fn(),
  onNextDay: jest.fn(),
};

describe('ChooseSlotView', () => {
  it('renders one chip per slot and reports the selection', async () => {
    const onSelectSlot = jest.fn();
    await render(<ChooseSlotView {...base} onSelectSlot={onSelectSlot} />);
    expect(screen.getByTestId('slot-chip-09-00')).toBeTruthy();
    expect(screen.getByTestId('slot-chip-09-15')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('slot-chip-09-15'));
    expect(onSelectSlot).toHaveBeenCalledWith(base.slots[1]);
  });

  it('removes a chip when its slot disappears (live update)', async () => {
    const { rerender } = await render(<ChooseSlotView {...base} />);
    expect(screen.getByTestId('slot-chip-09-00')).toBeTruthy();
    await rerender(<ChooseSlotView {...base} slots={base.slots.slice(1)} />);
    await waitFor(() => expect(screen.queryByTestId('slot-chip-09-00')).toBeNull());
    expect(screen.getByTestId('slot-chip-09-15')).toBeTruthy();
  });

  it('shows the empty state with a next-day action', async () => {
    const onNextDay = jest.fn();
    await render(<ChooseSlotView {...base} slots={[]} onNextDay={onNextDay} />);
    expect(screen.getByText('No free times this day — try another day')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('next-day-button'));
    expect(onNextDay).toHaveBeenCalled();
  });

  it('shows skeletons while loading', async () => {
    await render(<ChooseSlotView {...base} isLoading />);
    expect(screen.getByTestId('slots-loading')).toBeTruthy();
    expect(screen.queryByTestId('slot-grid')).toBeNull();
  });

  it('shows the error state with Retry', async () => {
    const onRetry = jest.fn();
    await render(<ChooseSlotView {...base} error={new DomainError('network')} onRetry={onRetry} />);
    await fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('warns when live updates are paused', async () => {
    await render(<ChooseSlotView {...base} liveStatus="paused" />);
    expect(screen.getByText('Live updates paused')).toBeTruthy();
  });

  it('numbers enabled day chips and marks disabled ones', async () => {
    await render(<ChooseSlotView {...base} />);
    expect(screen.getByTestId('day-chip-0')).toBeTruthy();
    expect(screen.getByTestId('day-chip-1')).toBeTruthy();
    expect(screen.getByTestId('day-chip-disabled-2026-10-04')).toBeTruthy();
  });
});
