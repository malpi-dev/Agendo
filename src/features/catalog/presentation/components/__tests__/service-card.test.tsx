import { fireEvent, render, screen } from '@testing-library/react-native';

import { demoServices } from '@/features/demo/data/fixtures';

import { ServiceCard } from '../service-card';

describe('ServiceCard', () => {
  const service = demoServices[1]!; // Skin fade, 45 min, $28

  it('formats price and duration', async () => {
    await render(<ServiceCard service={service} currency="USD" onPress={jest.fn()} />);
    expect(screen.getByText('$28.00')).toBeTruthy();
    expect(screen.getByText('45 min')).toBeTruthy();
    expect(screen.getByText('Skin fade')).toBeTruthy();
  });

  it('calls onPress with the service', async () => {
    const onPress = jest.fn();
    await render(<ServiceCard service={service} currency="USD" onPress={onPress} />);
    await fireEvent.press(screen.getByTestId(`service-card-${service.id}`));
    expect(onPress).toHaveBeenCalledWith(service);
  });
});
