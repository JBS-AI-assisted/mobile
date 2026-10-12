import { createSession, RefreshRejectedError } from './session';
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

describe('session', () => {
  function setup(refreshFn: jest.Mock, clock = { t: 0 }) {
    const { storage } = memoryStorage();
    const store = createTokenStore(storage);
    const onSignedOut = jest.fn();
    const session = createSession({ store, refreshFn, onSignedOut, now: () => clock.t });
    return { store, session, onSignedOut, clock };
  }

  it('returns null when signed out and never calls refresh', async () => {
    const refreshFn = jest.fn();
    const { session } = setup(refreshFn);
    expect(await session.getAccessToken()).toBeNull();
    expect(refreshFn).not.toHaveBeenCalled();
  });

  it('returns the stored token while it is fresh', async () => {
    const refreshFn = jest.fn();
    const { session } = setup(refreshFn);
    await session.signIn(tokens(1));
    expect(await session.getAccessToken()).toBe('access-1');
    expect(refreshFn).not.toHaveBeenCalled();
  });

  it('refreshes ahead of expiry (inside the skew window)', async () => {
    const refreshFn = jest.fn().mockResolvedValue(tokens(2));
    const { session, clock } = setup(refreshFn);
    await session.signIn(tokens(1));
    clock.t = 900_000 - 10_000;
    expect(await session.getAccessToken()).toBe('access-2');
    expect(refreshFn).toHaveBeenCalledWith('refresh-1');
  });

  it('is single-flight: concurrent callers share one refresh request', async () => {
    let resolve!: (v: ReturnType<typeof tokens>) => void;
    const refreshFn = jest.fn(
      () => new Promise<ReturnType<typeof tokens>>((r) => (resolve = r)),
    );
    const { session, store } = setup(refreshFn);
    await session.signIn(tokens(1));

    const calls = [session.refresh(), session.refresh(), session.refresh()];
    await Promise.resolve();
    await Promise.resolve();
    resolve(tokens(2));

    expect(await Promise.all(calls)).toEqual(['access-2', 'access-2', 'access-2']);
    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect((await store.read())?.refreshToken).toBe('refresh-2');
  });

  it('allows a new refresh after the previous one settled', async () => {
    const refreshFn = jest.fn().mockResolvedValueOnce(tokens(2)).mockResolvedValueOnce(tokens(3));
    const { session } = setup(refreshFn);
    await session.signIn(tokens(1));
    await session.refresh();
    expect(await session.refresh()).toBe('access-3');
    expect(refreshFn).toHaveBeenNthCalledWith(2, 'refresh-2');
  });

  it('signs out locally when the server rejects the refresh token', async () => {
    const refreshFn = jest.fn().mockRejectedValue(new RefreshRejectedError());
    const { session, store, onSignedOut } = setup(refreshFn);
    await session.signIn(tokens(1));
    expect(await session.refresh()).toBeNull();
    expect(await store.read()).toBeNull();
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  it('keeps the session on a transient failure and lets a later call retry', async () => {
    const refreshFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(tokens(2));
    const { session, store, onSignedOut } = setup(refreshFn);
    await session.signIn(tokens(1));
    await expect(session.refresh()).rejects.toThrow('network down');
    expect(await store.read()).not.toBeNull();
    expect(onSignedOut).not.toHaveBeenCalled();
    expect(await session.refresh()).toBe('access-2');
  });

  it('signOut clears tokens and notifies, even if storage throws', async () => {
    const { session, store, onSignedOut } = setup(jest.fn());
    await session.signIn(tokens(1));
    jest.spyOn(store, 'clear').mockRejectedValueOnce(new Error('keychain locked'));
    await expect(session.signOut()).resolves.toBeUndefined();
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });
});
