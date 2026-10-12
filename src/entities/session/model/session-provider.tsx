import createClient from 'openapi-fetch';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { paths } from '@/shared/api';
import { API_BASE_URL } from '@/shared/config';

import { secureStorage } from '../lib/secure-storage';
import { createSession, RefreshRejectedError, type Session } from './session';
import { createTokenStore, type AuthTokens } from './token-store';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionContextValue {
  status: Status;
  /** Set when the session ended on its own (refresh rejected), cleared on the next sign in. */
  sessionExpired: boolean;
  /** Token source for the API client. */
  session: Session;
  /** Store tokens from a successful sign in and enter the app. */
  startSession(tokens: AuthTokens): Promise<void>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [sessionExpired, setSessionExpired] = useState(false);

  const deps = useMemo(() => {
    const store = createTokenStore(secureStorage);
    // Plain client for /auth/refresh: no middleware, so it can never recurse into itself.
    const bare = createClient<paths>({ baseUrl: API_BASE_URL });
    const session = createSession({
      store,
      refreshFn: async (refreshToken) => {
        const { data, response } = await bare.POST('/auth/refresh', { body: { refreshToken } });
        if (response.status === 401) throw new RefreshRejectedError();
        if (!data) throw new Error(`refresh failed (${response.status})`);
        return data;
      },
      onSignedOut: () => {
        setSessionExpired(true);
        setStatus('signedOut');
      },
    });
    return { store, session };
  }, []);

  useEffect(() => {
    // Presence of a stored session is enough to enter the app; the first request refreshes if needed.
    // Works offline, which matters for workout logging.
    deps.store.read().then(
      (stored) => setStatus(stored ? 'signedIn' : 'signedOut'),
      () => setStatus('signedOut'),
    );
  }, [deps]);

  const startSession = useCallback(
    async (tokens: AuthTokens) => {
      await deps.session.signIn(tokens);
      setSessionExpired(false);
      setStatus('signedIn');
    },
    [deps],
  );

  const signOut = useCallback(async () => {
    setSessionExpired(false);
    await deps.session.signOut();
  }, [deps]);

  const value = useMemo(
    () => ({ status, sessionExpired, session: deps.session, startSession, signOut }),
    [status, sessionExpired, deps, startSession, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
