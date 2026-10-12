import { useLocalSearchParams, useRouter } from 'expo-router';

import { SignInForm } from '@/features/sign-in';
import { FormScreen } from '@/shared/ui';

export function SignInPage() {
  const router = useRouter();
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  return (
    <FormScreen title="Welcome back">
      <SignInForm
        notice={notice === 'passwordUpdated' ? 'passwordUpdated' : undefined}
        onForgotPassword={() => router.push('/forgot-password')}
      />
    </FormScreen>
  );
}
