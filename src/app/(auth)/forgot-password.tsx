import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthScreen, InlineBanner, PrimaryButton, TextButton, TextField } from '@/components';
import { toFeedback, type Feedback } from '@/auth/feedback';
import { useAuth } from '@/auth/provider';
import { validateEmail } from '@/auth/validation';

export default function ForgotPassword() {
  const router = useRouter();
  const { service } = useAuth();
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ fields: {} });
  const [loading, setLoading] = useState(false);

  async function submit() {
    const emailError = validateEmail(email);
    if (emailError) {
      setFeedback({ fields: { email: emailError } });
      return;
    }
    setFeedback({ fields: {} });
    setLoading(true);
    const outcome = await service.requestReset(email.trim());
    setLoading(false);
    if (!outcome.ok) {
      setFeedback(toFeedback(outcome.presentation));
      return;
    }
    // Same result whether or not the account exists: no hint either way.
    router.push({ pathname: '/reset-password', params: { email: email.trim() } });
  }

  return (
    <AuthScreen
      title="Reset your password"
      body="Enter your email. If there's an account, we'll send you a code to reset it."
    >
      {feedback.banner ? <InlineBanner variant={feedback.banner.variant} message={feedback.banner.message} /> : null}
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
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <PrimaryButton label="Send reset code" loading={loading} onPress={submit} />
      <TextButton label="Back to sign in" onPress={() => router.back()} />
    </AuthScreen>
  );
}
