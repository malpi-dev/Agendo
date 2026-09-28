import { render, screen } from '@testing-library/react-native';

import { Avatar } from '../avatar';

describe('Avatar', () => {
  it('shows initials when there is no image', async () => {
    await render(<Avatar name="Marco Polo" />);
    expect(screen.getByText('MP')).toBeTruthy();
  });

  it('uses a single initial for one-word names', async () => {
    await render(<Avatar name="Lena" />);
    expect(screen.getByText('L')).toBeTruthy();
  });
});
