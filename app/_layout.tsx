import { Stack } from 'expo-router';

import { AppProviders } from '@/app';
import { useSession } from '@/entities/session';

function Routes() {
  const { status } = useSession();
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
    <AppProviders>
      <Routes />
    </AppProviders>
  );
}
