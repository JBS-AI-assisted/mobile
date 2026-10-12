import type { components } from '@/api/schema';
import { isOldEnough, isPlausibleBirthYear, MIN_AGE } from '@/auth/config';
import { presentAuthError, presentOffline, shouldClearPassword } from '@/auth/error-copy';
import { createSession, RefreshRejectedError } from '@/auth/session';
import { createTokenStore, type SecureStorage } from '@/auth/token-store';

type ErrorCode = components['schemas']['ErrorCode'];

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

describe('age config', () => {
  it('is 16 per the CEO (2026-10-12)', () => {
    expect(MIN_AGE).toBe(16);
  });

  it('uses the permissive year-only rule', () => {
    const now = new Date('2026-10-12');
    expect(isOldEnough(2010, now)).toBe(true);
    expect(isOldEnough(2011, now)).toBe(false);
    expect(isOldEnough(2012, now, 14)).toBe(true);
    expect(isOldEnough(2013, now, 14)).toBe(false);
  });

  it('rejects implausible years and non-integers', () => {
    const now = new Date('2026-10-12');
    expect(isPlausibleBirthYear(1899, now)).toBe(false);
    expect(isPlausibleBirthYear(2027, now)).toBe(false);
    expect(isPlausibleBirthYear(1990.5, now)).toBe(false);
    expect(isPlausibleBirthYear(1990, now)).toBe(true);
  });
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

describe('error copy', () => {
  const err = (code: ErrorCode, fields?: { field: string; code: string }[]) => ({
    code,
    message: 'ignored debug text',
    fields,
  });

  it('never uses the server message', () => {
    const p = presentAuthError(err('invalid_credentials'), 'signIn');
    expect(JSON.stringify(p)).not.toContain('ignored debug text');
  });

  it('sign in: one message for wrong credentials, password cleared', () => {
    expect(presentAuthError(err('invalid_credentials'), 'signIn')).toEqual({
      kind: 'banner',
      tone: 'error',
      message: 'Email or password is incorrect.',
    });
    expect(shouldClearPassword(err('invalid_credentials'), 'signIn')).toBe(true);
    expect(shouldClearPassword(err('invalid_credentials'), 'signUp')).toBe(false);
  });

  it('email_taken is a field error with the sign-in shortcut', () => {
    expect(presentAuthError(err('email_taken'), 'signUp')).toEqual({
      kind: 'fields',
      fields: [
        {
          field: 'email',
          message: 'An account with this email already exists.',
          action: 'signInInstead',
        },
      ],
    });
  });

  it('validation_failed maps field codes to field copy', () => {
    const p = presentAuthError(
      err('validation_failed', [
        { field: 'password', code: 'too_common' },
        { field: 'email', code: 'invalid_format' },
      ]),
      'signUp',
    );
    expect(p).toEqual({
      kind: 'fields',
      fields: [
        { field: 'password', message: 'That password is too common. Choose another.' },
        { field: 'email', message: "That doesn't look like an email address." },
      ],
    });
  });

  it('under_min_age wins over other field errors', () => {
    const p = presentAuthError(
      err('validation_failed', [
        { field: 'password', code: 'too_short' },
        { field: 'birthYear', code: 'under_min_age' },
      ]),
      'signUp',
    );
    expect(p).toEqual({ kind: 'underAge' });
  });

  it('validation_failed with only unknown fields falls back to generic', () => {
    const p = presentAuthError(err('validation_failed', [{ field: 'nope', code: 'x' }]), 'signUp');
    expect(p).toMatchObject({ kind: 'banner', message: 'Something went wrong on our side. Try again.' });
  });

  it('rate_limited copy differs for the reset request', () => {
    expect(presentAuthError(err('rate_limited'), 'resetRequest')).toMatchObject({
      message: 'Too many requests. Try again in a few minutes.',
    });
    expect(presentAuthError(err('rate_limited'), 'signIn')).toMatchObject({
      message: 'Too many attempts. Try again in a few minutes.',
    });
  });

  it('code_locked makes resend the primary action', () => {
    expect(presentAuthError(err('code_locked'), 'resetConfirm')).toMatchObject({
      primaryAction: 'resendCode',
    });
  });

  it('invalid_password is a field error only for account deletion', () => {
    expect(presentAuthError(err('invalid_password'), 'deleteAccount')).toEqual({
      kind: 'fields',
      fields: [{ field: 'password', message: 'Password is incorrect.' }],
    });
    expect(presentAuthError(err('invalid_password'), 'signIn')).toMatchObject({ kind: 'banner' });
  });

  it('session and profile codes route instead of showing copy', () => {
    expect(presentAuthError(err('unauthorized'), 'signIn')).toMatchObject({ kind: 'sessionExpired' });
    expect(presentAuthError(err('invalid_refresh_token'), 'signIn')).toMatchObject({
      kind: 'sessionExpired',
    });
    expect(presentAuthError(err('profile_not_found'), 'signIn')).toEqual({
      kind: 'route',
      to: 'onboarding',
    });
  });

  it('unknown codes are generic', () => {
    const p = presentAuthError({ code: 'brand_new_code' as ErrorCode, message: 'x' }, 'signIn');
    expect(p).toMatchObject({ kind: 'banner', message: 'Something went wrong on our side. Try again.' });
  });

  it('offline is a warning banner per context', () => {
    expect(presentOffline('signIn')).toEqual({
      kind: 'banner',
      tone: 'warning',
      message: "You're offline. Connect to the internet to sign in.",
    });
  });
});
