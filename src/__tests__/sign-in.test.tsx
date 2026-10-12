import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import SignIn from '@/app/(auth)/sign-in';

const mockSignIn = jest.fn();
jest.mock('@/auth/provider', () => ({ useAuth: () => ({ signIn: mockSignIn, sessionExpired: false }) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning' },
}));

const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <SignIn />
    </SafeAreaProvider>,
  );

describe('Sign in screen', () => {
  beforeEach(() => mockSignIn.mockReset());

  it('validates before calling the API', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Sign in'));
    expect(screen.getByText('Enter your email.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows one banner for wrong credentials and clears the password', async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      clearPassword: true,
      presentation: { kind: 'banner', tone: 'error', message: 'Email or password is incorrect.' },
    });
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
    fireEvent.changeText(screen.getByLabelText('Password'), 'wrong-password');
    fireEvent.press(screen.getByLabelText('Sign in'));
    await waitFor(() => expect(screen.getByText('Email or password is incorrect.')).toBeTruthy());
    expect(screen.getByLabelText('Password').props.value).toBe('');
  });
});
