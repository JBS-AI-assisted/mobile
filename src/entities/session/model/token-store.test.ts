import { createTokenStore, type SecureStorage } from './token-store';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: SecureStorage = {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    deleteItem: async (k) => void data.delete(k),
  };
  return { storage, data };
}

const tokens = (n: number) => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  accessTokenExpiresIn: 900,
});

describe('token store', () => {
  it('round-trips a session and computes expiry', async () => {
    const { storage } = memoryStorage();
    const store = createTokenStore(storage);
    await store.save(tokens(1), 1_000);
    expect(await store.read()).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      accessExpiresAt: 1_000 + 900_000,
    });
  });

  it('clears', async () => {
    const { storage } = memoryStorage();
    const store = createTokenStore(storage);
    await store.save(tokens(1));
    await store.clear();
    expect(await store.read()).toBeNull();
  });

  it('treats a corrupt entry as signed out and removes it', async () => {
    const { storage, data } = memoryStorage({ 'jsb.session': '{not json' });
    const store = createTokenStore(storage);
    expect(await store.read()).toBeNull();
    expect(data.size).toBe(0);
  });

  it('treats a wrong-shape entry as signed out', async () => {
    const { storage } = memoryStorage({ 'jsb.session': JSON.stringify({ accessToken: 1 }) });
    expect(await createTokenStore(storage).read()).toBeNull();
  });
});
