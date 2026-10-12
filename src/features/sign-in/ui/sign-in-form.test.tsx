import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiContext } from '@/shared/api';

import { signIn } from '../api/sign-in';
import { SignInForm } from './sign-in-form';

const mockStartSession = jest.fn();
jest.mock('@/entities/session', () => ({
  useSession: () => ({ startSession: mockStartSession, sessionExpired: false }),
}));
jest.mock('../api/sign-in', () => ({ signIn: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning' },
}));

const mockedSignIn = jest.mocked(signIn);
const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderForm = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ApiContext.Provider value={{} as never}>
        <SignInForm onForgotPassword={jest.fn()} />
      </ApiContext.Provider>
    </SafeAreaProvider>,
  );

describe('SignInForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates before calling the API', () => {
    renderForm();
    fireEvent.press(screen.getByLabelText('Sign in'));
    expect(screen.getByText('Enter your email.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(mockedSignIn).not.toHaveBeenCalled();
  });

  it('shows one banner for wrong credentials and clears the password', async () => {
    mockedSignIn.mockResolvedValue({
      ok: false,
      clearPassword: true,
      presentation: { kind: 'banner', tone: 'error', message: 'Email or password is incorrect.' },
    });
    renderForm();
    fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
    fireEvent.changeText(screen.getByLabelText('Password'), 'wrong-password');
    fireEvent.press(screen.getByLabelText('Sign in'));
    await waitFor(() => expect(screen.getByText('Email or password is incorrect.')).toBeTruthy());
    expect(screen.getByLabelText('Password').props.value).toBe('');
  });

  it('starts the session with the returned tokens', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', accessTokenExpiresIn: 900 };
    mockedSignIn.mockResolvedValue({ ok: true, data: tokens });
    renderForm();
    fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
    fireEvent.changeText(screen.getByLabelText('Password'), 'pw');
    fireEvent.press(screen.getByLabelText('Sign in'));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledWith(tokens));
  });
});
