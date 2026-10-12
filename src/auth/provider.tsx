import createClient from 'openapi-fetch';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createApiClient } from '@/api/client';
import type { paths } from '@/api/schema';

import { createAuthService, type AuthService, type Outcome } from './auth-service';
import { API_BASE_URL } from './config';
import { secureStorage } from './secure-storage';
import { createSession, RefreshRejectedError, type Session } from './session';
import { createTokenStore } from './token-store';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  /** Set when the session ended on its own (refresh rejected), cleared on the next sign in. */
  sessionExpired: boolean;
  api: ReturnType<typeof createApiClient>;
  service: AuthService;
  signIn(email: string, password: string): Promise<Outcome>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [sessionExpired, setSessionExpired] = useState(false);

  const deps = useMemo(() => {
    const store = createTokenStore(secureStorage);
    // Plain client for /auth/refresh: no middleware, so it can never recurse into itself.
    const bare = createClient<paths>({ baseUrl: API_BASE_URL });
    const session: Session = createSession({
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
    const api = createApiClient({ baseUrl: API_BASE_URL, session });
    return { store, session, api, service: createAuthService(api, session) };
  }, []);

  useEffect(() => {
    // Presence of a stored session is enough to enter the app; the first request refreshes if needed.
    // Works offline, which matters for workout logging.
    deps.store.read().then(
      (stored) => setStatus(stored ? 'signedIn' : 'signedOut'),
      () => setStatus('signedOut'),
    );
  }, [deps]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const outcome = await deps.service.signIn(email, password);
      if (outcome.ok) {
        setSessionExpired(false);
        setStatus('signedIn');
      }
      return outcome;
    },
    [deps],
  );

  const signOut = useCallback(async () => {
    setSessionExpired(false);
    await deps.session.signOut();
  }, [deps]);

  const value = useMemo(
    () => ({ status, sessionExpired, api: deps.api, service: deps.service, signIn, signOut }),
    [status, sessionExpired, deps, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
