import { useRouter } from 'expo-router';

import { RequestResetForm } from '@/features/password-reset';
import { FormScreen } from '@/shared/ui';

export function ForgotPasswordPage() {
  const router = useRouter();
  return (
    <FormScreen
      title="Reset your password"
      body="Enter your email. If there's an account, we'll send you a code to reset it."
    >
      <RequestResetForm
        onSent={(email) => router.push({ pathname: '/reset-password', params: { email } })}
        onBack={() => router.back()}
      />
    </FormScreen>
  );
}
