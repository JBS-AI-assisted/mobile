import { Stack } from 'expo-router';

import { AuthProvider, useAuth } from '@/auth/provider';

function Routes() {
  const { status } = useAuth();
  // While the stored session is read, render nothing (native splash covers it).
  if (status === 'loading') return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}
