import { useLocalSearchParams, useRouter } from 'expo-router';

import { ConfirmResetForm } from '@/features/password-reset';
import { FormScreen } from '@/shared/ui';

export function ResetPasswordPage() {
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  return (
    <FormScreen
      title="Check your email"
      body={`If an account exists for ${email}, a code is on its way. It works for 30 minutes.`}
    >
      <ConfirmResetForm
        email={email}
        onDone={() => router.replace({ pathname: '/sign-in', params: { notice: 'passwordUpdated' } })}
      />
    </FormScreen>
  );
}
