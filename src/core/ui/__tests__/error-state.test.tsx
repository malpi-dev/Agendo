import { fireEvent, render, screen } from '@testing-library/react-native';

import { DomainError } from '@/core/errors';

import { ErrorState } from '../error-state';

describe('ErrorState', () => {
  it('shows the offline title and a working Retry for network errors', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState error={new DomainError('network')} onRetry={onRetry} />);
    expect(screen.getByText("You're offline")).toBeTruthy();
    await fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show Retry for slotUnavailable', async () => {
    await render(<ErrorState error={new DomainError('slotUnavailable')} onRetry={jest.fn()} />);
    expect(screen.getByText('That time was just taken')).toBeTruthy();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('falls back to a generic message for raw errors', async () => {
    await render(<ErrorState error={new Error('boom')} onRetry={jest.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });
});
