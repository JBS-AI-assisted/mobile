import { useMemo, type ReactNode } from 'react';

import { useSession, SessionProvider } from '@/entities/session';
import { ApiContext, createApiClient } from '@/shared/api';
import { API_BASE_URL } from '@/shared/config';

/** Wires the session into the API client once, so features only ever see `useApi()`. */
function ApiProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const client = useMemo(() => createApiClient({ baseUrl: API_BASE_URL, session }), [session]);
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ApiProvider>{children}</ApiProvider>
    </SessionProvider>
  );
}
