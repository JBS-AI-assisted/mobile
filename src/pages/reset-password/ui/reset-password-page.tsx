import { useLocalSearchParams, useRouter } from 'expo-router';

import { ConfirmResetForm } from '@/features/password-reset';

export function ResetPasswordPage() {
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  return (
    <ConfirmResetForm
      email={email}
      onDone={() => router.replace({ pathname: '/sign-in', params: { notice: 'passwordUpdated' } })}
    />
  );
}
