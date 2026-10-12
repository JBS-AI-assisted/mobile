import { render, screen } from '@testing-library/react-native';

import Index from '@/app/(app)/index';

describe('Index', () => {
  it('renders the placeholder title', () => {
    render(<Index />);
    expect(screen.getByText('JSB')).toBeTruthy();
  });
});
