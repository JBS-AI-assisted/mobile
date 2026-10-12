import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiContext } from '@/shared/api';

import { confirmReset, requestReset } from '../api/password-reset';
import { ConfirmResetForm } from './confirm-reset-form';
import { RequestResetForm } from './request-reset-form';

jest.mock('../api/password-reset', () => ({ requestReset: jest.fn(), confirmReset: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
}));

const mockedRequest = jest.mocked(requestReset);
const mockedConfirm = jest.mocked(confirmReset);

const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderForm = (ui: ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ApiContext.Provider value={{} as never}>{ui}</ApiContext.Provider>
    </SafeAreaProvider>,
  );

const offline = {
  ok: false as const,
  clearPassword: false,
  presentation: {
    kind: 'banner' as const,
    tone: 'warning' as const,
    message: "You're offline. Connect to the internet to reset your password.",
  },
};

beforeEach(() => jest.clearAllMocks());

describe('RequestResetForm', () => {
  it('validates the email, then reports the sent email without revealing whether the account exists', async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: undefined });
    const onSent = jest.fn();
    renderForm(<RequestResetForm onSent={onSent} onBack={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Send reset code'));
    expect(screen.getByText('Enter your email.')).toBeTruthy();
    expect(mockedRequest).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
    fireEvent.press(screen.getByLabelText('Send reset code'));
    await waitFor(() => expect(onSent).toHaveBeenCalledWith('a@b.co'));
  });

  it('shows the offline copy and does not move on', async () => {
    mockedRequest.mockResolvedValue(offline);
    const onSent = jest.fn();
    renderForm(<RequestResetForm onSent={onSent} onBack={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
    fireEvent.press(screen.getByLabelText('Send reset code'));
    await waitFor(() => expect(screen.getByText(offline.presentation.message)).toBeTruthy());
    expect(onSent).not.toHaveBeenCalled();
  });
});

describe('ConfirmResetForm', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const fillAndSubmit = async () => {
    fireEvent.changeText(screen.getByLabelText('Code'), '123456');
    fireEvent.changeText(screen.getByLabelText('New password'), 'long-enough-pw');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Set new password'));
    });
  };

  it('counts down the resend cooldown, then allows a resend that restarts it', async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: undefined });
    renderForm(<ConfirmResetForm email="a@b.co" onDone={jest.fn()} />);
    expect(screen.getByText('Resend code in 30s')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    expect(screen.getByText('Resend code')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Resend code'));
    });
    expect(mockedRequest).toHaveBeenCalledWith(expect.anything(), 'a@b.co');
    expect(screen.getByText('Code sent')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(3_500);
    });
    expect(screen.getByText('Resend code in 27s')).toBeTruthy();
  });

  it('replaces the form with the locked banner and makes Resend the primary action', async () => {
    mockedConfirm.mockResolvedValue({
      ok: false,
      clearPassword: false,
      presentation: {
        kind: 'banner',
        tone: 'error',
        message: 'Too many incorrect codes. Request a new code to continue.',
        primaryAction: 'resendCode',
      },
    });
    renderForm(<ConfirmResetForm email="a@b.co" onDone={jest.fn()} />);
    await fillAndSubmit();
    expect(screen.getByText('Too many incorrect codes. Request a new code to continue.')).toBeTruthy();
    expect(screen.queryByLabelText('Code')).toBeNull();
    expect(screen.queryByLabelText('Set new password')).toBeNull();
    expect(screen.getByLabelText('Resend code')).toBeTruthy();
  });

  it('shows the offline copy and keeps what the user typed', async () => {
    mockedConfirm.mockResolvedValue(offline);
    renderForm(<ConfirmResetForm email="a@b.co" onDone={jest.fn()} />);
    await fillAndSubmit();
    expect(screen.getByText(offline.presentation.message)).toBeTruthy();
    expect(screen.getByLabelText('Code').props.value).toBe('123456');
    expect(screen.getByLabelText('New password').props.value).toBe('long-enough-pw');
  });

  it('calls onDone once the password is set', async () => {
    mockedConfirm.mockResolvedValue({ ok: true, data: undefined });
    const onDone = jest.fn();
    renderForm(<ConfirmResetForm email="a@b.co" onDone={onDone} />);
    await fillAndSubmit();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
