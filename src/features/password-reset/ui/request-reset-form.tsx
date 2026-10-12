import { useState } from 'react';
import { View } from 'react-native';

import { toFeedback, useApi, type Feedback } from '@/shared/api';
import { validateEmail } from '@/shared/lib';
import { space } from '@/shared/theme';
import { InlineBanner, PrimaryButton, TextButton, TextField } from '@/shared/ui';

import { requestReset } from '../api/password-reset';

type Props = {
  /** Called on any 2xx: the result is the same whether or not the account exists. */
  onSent: (email: string) => void;
  onBack: () => void;
};

export function RequestResetForm({ onSent, onBack }: Props) {
  const api = useApi();
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
    const outcome = await requestReset(api, email.trim());
    setLoading(false);
    if (!outcome.ok) {
      setFeedback(toFeedback(outcome.presentation));
      return;
    }
    onSent(email.trim());
  }

  return (
    <View style={{ gap: space.md }}>
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
      <TextButton label="Back to sign in" onPress={onBack} />
    </View>
  );
}
