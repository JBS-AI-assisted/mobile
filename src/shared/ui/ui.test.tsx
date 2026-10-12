import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FormScreen, InlineBanner, PrimaryButton, TextButton, TextField } from './index';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('PrimaryButton', () => {
  it('calls onPress', () => {
    const onPress = jest.fn();
    render(<PrimaryButton label="Sign in" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores taps and reports busy while loading', () => {
    const onPress = jest.fn();
    render(<PrimaryButton label="Sign in" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ busy: true });
  });

  it('ignores taps when disabled', () => {
    const onPress = jest.fn();
    render(<PrimaryButton label="Sign in" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('TextButton', () => {
  it('calls onPress, and not when disabled', () => {
    const onPress = jest.fn();
    const { rerender } = render(<TextButton label="Forgot password?" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    rerender(<TextButton label="Forgot password?" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('InlineBanner', () => {
  it('renders the message as an alert', () => {
    render(<InlineBanner message="Email or password is incorrect." />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Email or password is incorrect.')).toBeTruthy();
  });
});

describe('TextField', () => {
  it('shows the label and forwards typing', () => {
    const onChangeText = jest.fn();
    render(<TextField label="Email" value="" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
    expect(onChangeText).toHaveBeenCalledWith('a@b.co');
  });

  it('shows the error instead of the helper', () => {
    render(<TextField label="Password" helper="At least 10 characters." error="Use at least 10 characters." password />);
    expect(screen.getByText('Use at least 10 characters.')).toBeTruthy();
    expect(screen.queryByText('At least 10 characters.')).toBeNull();
  });

  it('toggles password visibility', () => {
    render(<TextField label="Password" value="secret" onChangeText={() => {}} password />);
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy();
  });

  it('does not accept input when disabled', () => {
    render(<TextField label="Email" value="" onChangeText={() => {}} disabled />);
    expect(screen.getByLabelText('Email').props.editable).toBe(false);
  });
});

describe('FormScreen', () => {
  it('renders the footer outside the scrolling content', () => {
    const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <FormScreen title="Title" footer={<Text>pinned</Text>}>
          <Text>field</Text>
        </FormScreen>
      </SafeAreaProvider>,
    );
    expect(screen.getByText('pinned')).toBeTruthy();
    expect(screen.getByText('field')).toBeTruthy();
  });
});
