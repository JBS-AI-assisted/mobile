import { useRouter } from 'expo-router';

import { RequestResetForm } from '@/features/password-reset';

export function ForgotPasswordPage() {
  const router = useRouter();
  return (
    <RequestResetForm
      onSent={(email) => router.push({ pathname: '/reset-password', params: { email } })}
      onBack={() => router.back()}
    />
  );
}
