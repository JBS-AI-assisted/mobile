import type { AuthTokens, TokenStore } from './token-store';

/** Thrown by `refreshFn` when the server says the refresh token is dead (401 `invalid_refresh_token`). */
export class RefreshRejectedError extends Error {
  constructor() {
    super('refresh_rejected');
    this.name = 'RefreshRejectedError';
  }
}

export interface SessionDeps {
  store: TokenStore;
  /** POST /auth/refresh. Throw RefreshRejectedError on 401; any other throw is treated as transient. */
  refreshFn: (refreshToken: string) => Promise<AuthTokens>;
  /** Called after local tokens are cleared because the session is over. */
  onSignedOut: () => void;
  now?: () => number;
  /** Refresh this long before expiry so a request does not race the deadline. */
  skewMs?: number;
}

export interface Session {
  /** A valid access token, refreshing first if needed. Null when signed out. */
  getAccessToken(): Promise<string | null>;
  /**
   * Force a refresh (after a 401). Single-flight: concurrent callers share one request,
   * because rotation would make the second call look like token reuse.
   * Resolves to the new access token, or null if the session ended.
   */
  refresh(): Promise<string | null>;
  signIn(tokens: AuthTokens): Promise<void>;
  /** Clears local tokens and notifies. Never throws. */
  signOut(): Promise<void>;
}

export function createSession(deps: SessionDeps): Session {
  const { store, refreshFn, onSignedOut } = deps;
  const now = deps.now ?? Date.now;
  const skewMs = deps.skewMs ?? 30_000;
  let inFlight: Promise<string | null> | null = null;

  async function signOut() {
    try {
      await store.clear();
    } catch {
      // local sign out must not fail; the UI moves on regardless
    }
    onSignedOut();
  }

  function refresh() {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const current = await store.read();
      if (!current) return null;
      try {
        const next = await refreshFn(current.refreshToken);
        const saved = await store.save(next, now());
        return saved.accessToken;
      } catch (error) {
        if (error instanceof RefreshRejectedError) {
          await signOut();
          return null;
        }
        // Network or 5xx: keep the session, let the caller surface the failure.
        throw error;
      }
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return {
    async getAccessToken() {
      const current = await store.read();
      if (!current) return null;
      if (current.accessExpiresAt - now() > skewMs) return current.accessToken;
      return refresh();
    },
    refresh,
    async signIn(tokens) {
      await store.save(tokens, now());
    },
    signOut,
  };
}
