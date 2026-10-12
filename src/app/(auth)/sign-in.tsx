import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';

import { AuthScreen, InlineBanner, PrimaryButton, TextButton, TextField } from '@/components';
import { toFeedback, type Feedback } from '@/auth/feedback';
import { useAuth } from '@/auth/provider';
import { validateEmail, validateLoginPassword } from '@/auth/validation';

export default function SignIn() {
  const router = useRouter();
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  const { signIn, sessionExpired } = useAuth();
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
    const outcome = await signIn(email.trim(), password);
    if (outcome.ok) return; // the root layout swaps to the app
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
    <AuthScreen title="Welcome back">
      {banner ? <InlineBanner variant={banner.variant} message={banner.message} /> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
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
        onChangeText={setPassword}
        error={feedback.fields.password}
        disabled={loading}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <TextButton label="Forgot password?" align="flex-end" onPress={() => router.push('/forgot-password')} />
      <PrimaryButton label="Sign in" loading={loading} onPress={submit} />
      {/* "New here? Create an account" waits for contract v0.2 (age moves after sign-up). */}
    </AuthScreen>
  );
}
