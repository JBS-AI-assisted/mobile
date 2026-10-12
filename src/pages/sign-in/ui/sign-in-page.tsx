import { useLocalSearchParams, useRouter } from 'expo-router';

import { SignInForm } from '@/features/sign-in';

export function SignInPage() {
  const router = useRouter();
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  return (
    <SignInForm
      notice={notice === 'passwordUpdated' ? 'passwordUpdated' : undefined}
      onForgotPassword={() => router.push('/forgot-password')}
    />
  );
}
