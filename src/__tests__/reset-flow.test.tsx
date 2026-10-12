import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ForgotPassword from '@/app/(auth)/forgot-password';
import ResetPassword from '@/app/(auth)/reset-password';

const mockRequestReset = jest.fn();
const mockConfirmReset = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/auth/provider', () => ({
  useAuth: () => ({ service: { requestReset: mockRequestReset, confirmReset: mockConfirmReset } }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ email: 'a@b.co' }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
}));

const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderScreen = (ui: React.ReactElement) => render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

const offline = {
  ok: false,
  clearPassword: false,
  presentation: { kind: 'banner', tone: 'warning', message: "You're offline. Connect to the internet to reset your password." },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Forgot password', () => {
  it('validates the email, then moves on without revealing whether the account exists', async () => {
    mockRequestReset.mockResolvedValue({ ok: true });
    renderScreen(<ForgotPassword />);
    fireEvent.press(screen.getByLabelText('Send reset code'));
    expect(screen.getByText('Enter your email.')).toBeTruthy();
    expect(mockRequestReset).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
    fireEvent.press(screen.getByLabelText('Send reset code'));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/reset-password', params: { email: 'a@b.co' } }),
    );
  });

  it('shows the offline copy and stays on the screen', async () => {
    mockRequestReset.mockResolvedValue(offline);
    renderScreen(<ForgotPassword />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
    fireEvent.press(screen.getByLabelText('Send reset code'));
    await waitFor(() => expect(screen.getByText(offline.presentation.message)).toBeTruthy());
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('Reset password', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('counts down the resend cooldown, then allows a resend that restarts it', async () => {
    mockRequestReset.mockResolvedValue({ ok: true });
    renderScreen(<ResetPassword />);
    expect(screen.getByText('Resend code in 30s')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    expect(screen.getByText('Resend code')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Resend code'));
    });
    expect(mockRequestReset).toHaveBeenCalledWith('a@b.co');
    expect(screen.getByText('Code sent')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(3_500);
    });
    expect(screen.getByText('Resend code in 27s')).toBeTruthy();
  });

  it('replaces the form with the locked banner and makes Resend the primary action', async () => {
    mockConfirmReset.mockResolvedValue({
      ok: false,
      clearPassword: false,
      presentation: { kind: 'banner', tone: 'error', message: 'Too many incorrect codes. Request a new code to continue.', primaryAction: 'resendCode' },
    });
    renderScreen(<ResetPassword />);
    fireEvent.changeText(screen.getByLabelText('Code'), '123456');
    fireEvent.changeText(screen.getByLabelText('New password'), 'long-enough-pw');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Set new password'));
    });
    expect(screen.getByText('Too many incorrect codes. Request a new code to continue.')).toBeTruthy();
    expect(screen.queryByLabelText('Code')).toBeNull();
    expect(screen.queryByLabelText('Set new password')).toBeNull();
    expect(screen.getByLabelText('Resend code')).toBeTruthy();
  });

  it('shows the offline copy and keeps what the user typed', async () => {
    mockConfirmReset.mockResolvedValue(offline);
    renderScreen(<ResetPassword />);
    fireEvent.changeText(screen.getByLabelText('Code'), '123456');
    fireEvent.changeText(screen.getByLabelText('New password'), 'long-enough-pw');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Set new password'));
    });
    expect(screen.getByText(offline.presentation.message)).toBeTruthy();
    expect(screen.getByLabelText('Code').props.value).toBe('123456');
    expect(screen.getByLabelText('New password').props.value).toBe('long-enough-pw');
  });

  it('goes to sign in with the success notice once the password is set', async () => {
    mockConfirmReset.mockResolvedValue({ ok: true });
    renderScreen(<ResetPassword />);
    fireEvent.changeText(screen.getByLabelText('Code'), '123456');
    fireEvent.changeText(screen.getByLabelText('New password'), 'long-enough-pw');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Set new password'));
    });
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/sign-in', params: { notice: 'passwordUpdated' } });
  });
});
