import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';

import { useSession } from '@/entities/session';
import { toFeedback, useApi, withoutFieldError, type Feedback } from '@/shared/api';
import { validateEmail, validateLoginPassword } from '@/shared/lib';
import { FormScreen, InlineBanner, PrimaryButton, TextButton, TextField } from '@/shared/ui';

import { signIn } from '../api/sign-in';

type Props = {
  /** Shown once after a successful password reset. */
  notice?: 'passwordUpdated';
  onForgotPassword: () => void;
};

export function SignInForm({ notice, onForgotPassword }: Props) {
  const api = useApi();
  const { startSession, sessionExpired } = useSession();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ fields: {} });
  const [loading, setLoading] = useState(false);

  async function submit() {
    const fields: Record<string, string> = {};
    const emailError = validateEmail(email);
    const passwordError = validateLoginPassword(password);
    if (emailError) fields.email = emailError;
    if (passwordError) fields.password = passwordError;
    if (emailError || passwordError) {
      setFeedback({ fields });
      (emailError ? undefined : passwordRef.current)?.focus();
      return;
    }
    setFeedback({ fields: {} });
    setLoading(true);
    const outcome = await signIn(api, email.trim(), password);
    if (outcome.ok) {
      await startSession(outcome.data); // the root layout swaps to the app
      return;
    }
    setLoading(false);
    setFeedback(toFeedback(outcome.presentation));
    if (outcome.clearPassword) {
      setPassword('');
      passwordRef.current?.focus();
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  const banner = feedback.banner
    ? { variant: feedback.banner.variant, message: feedback.banner.message }
    : sessionExpired
      ? { variant: 'error' as const, message: 'Please sign in again.' }
      : notice === 'passwordUpdated'
        ? { variant: 'success' as const, message: 'Password updated. Sign in with your new password.' }
        : null;

  return (
    <FormScreen title="Welcome back" footer={<PrimaryButton label="Sign in" loading={loading} onPress={submit} />}>
      {banner ? <InlineBanner variant={banner.variant} message={banner.message} /> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setFeedback((f) => withoutFieldError(f, 'email'));
        }}
        error={feedback.fields.email}
        disabled={loading}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        password
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setFeedback((f) => withoutFieldError(f, 'password'));
        }}
        error={feedback.fields.password}
        disabled={loading}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <TextButton label="Forgot password?" align="flex-end" onPress={onForgotPassword} />
      {/* "New here? Create an account" waits for contract v0.2 (age moves after sign-up). */}
    </FormScreen>
  );
}
