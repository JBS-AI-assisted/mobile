import type { components } from '@/shared/api';

export type AuthTokens = components['schemas']['AuthTokens'];

/** Minimal surface of expo-secure-store, so the logic is testable without native code. */
export interface SecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token expires, computed on receipt. */
  accessExpiresAt: number;
}

export interface TokenStore {
  read(): Promise<StoredSession | null>;
  save(tokens: AuthTokens, now?: number): Promise<StoredSession>;
  clear(): Promise<void>;
}

const KEY = 'jsb.session';

export function createTokenStore(storage: SecureStorage): TokenStore {
  return {
    async read() {
      const raw = await storage.getItem(KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as Partial<StoredSession>;
        if (
          typeof parsed.accessToken === 'string' &&
          typeof parsed.refreshToken === 'string' &&
          typeof parsed.accessExpiresAt === 'number'
        ) {
          return parsed as StoredSession;
        }
      } catch {
        // fall through: corrupt entry is treated as signed out
      }
      await storage.deleteItem(KEY);
      return null;
    },
    async save(tokens, now = Date.now()) {
      const session: StoredSession = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresAt: now + tokens.accessTokenExpiresIn * 1000,
      };
      await storage.setItem(KEY, JSON.stringify(session));
      return session;
    },
    async clear() {
      await storage.deleteItem(KEY);
    },
  };
}
