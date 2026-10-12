import { render, screen } from '@testing-library/react-native';

import { HomePage } from './home-page';

describe('HomePage', () => {
  it('renders the placeholder title', () => {
    render(<HomePage />);
    expect(screen.getByText('JSB')).toBeTruthy();
  });
});
