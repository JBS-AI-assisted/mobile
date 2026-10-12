import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Platform, View, type TextInput } from 'react-native';

import { toFeedback, useApi, type Feedback } from '@/shared/api';
import { RESEND_COOLDOWN_SECONDS } from '@/shared/config';
import { useCountdown, validateNewPassword, validateResetCode } from '@/shared/lib';
import { space } from '@/shared/theme';
import { InlineBanner, PrimaryButton, TextButton, TextField } from '@/shared/ui';

import { confirmReset, requestReset } from '../api/password-reset';

type Props = {
  email: string;
  onDone: () => void;
};

export function ConfirmResetForm({ email, onDone }: Props) {
  const api = useApi();
  const passwordRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ fields: {} });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [sentNotice, setSentNotice] = useState(false);
  const { remaining, start } = useCountdown(RESEND_COOLDOWN_SECONDS);

  const locked = feedback.banner?.primaryAction === 'resendCode';
  const resendLabel = resending
    ? 'Sending...'
    : sentNotice
      ? 'Code sent'
      : remaining > 0
        ? `Resend code in ${remaining}s`
        : 'Resend code';

  async function resend() {
    setResending(true);
    const outcome = await requestReset(api, email);
    setResending(false);
    if (!outcome.ok) {
      setFeedback(toFeedback(outcome.presentation));
      return;
    }
    setFeedback({ fields: {} });
    setCode('');
    start(RESEND_COOLDOWN_SECONDS);
    setSentNotice(true);
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility('Code sent');
    setTimeout(() => setSentNotice(false), 3000);
  }

  async function submit() {
    const fields: Record<string, string> = {};
    const codeError = validateResetCode(code);
    const passwordError = validateNewPassword(password);
    if (codeError) fields.code = codeError;
    if (passwordError) fields.password = passwordError;
    if (codeError || passwordError) {
      setFeedback({ fields });
      return;
    }
    setFeedback({ fields: {} });
    setLoading(true);
    const outcome = await confirmReset(api, email, code, password);
    setLoading(false);
    if (!outcome.ok) {
      setFeedback(toFeedback(outcome.presentation));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone();
  }

  return (
    <View style={{ gap: space.md }}>
      {feedback.banner ? <InlineBanner variant={feedback.banner.variant} message={feedback.banner.message} /> : null}
      {locked ? null : (
        <>
          <TextField
            label="Code"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            error={feedback.fields.code}
            disabled={loading}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TextField
            ref={passwordRef}
            label="New password"
            password
            value={password}
            onChangeText={setPassword}
            error={feedback.fields.password}
            helper="At least 10 characters."
            disabled={loading}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <PrimaryButton label="Set new password" loading={loading} onPress={submit} />
        </>
      )}
      {locked ? (
        <PrimaryButton label="Resend code" loading={resending} onPress={resend} />
      ) : (
        <TextButton
          label={resendLabel}
          muted={remaining > 0 || sentNotice}
          disabled={remaining > 0 || resending || sentNotice}
          onPress={resend}
        />
      )}
    </View>
  );
}
