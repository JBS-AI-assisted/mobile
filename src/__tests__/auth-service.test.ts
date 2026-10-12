import { createApiClient } from '@/api/client';
import { createAuthService } from '@/auth/auth-service';
import { createSession } from '@/auth/session';
import { createTokenStore, type SecureStorage } from '@/auth/token-store';
import { validateEmail, validateNewPassword, validateResetCode } from '@/auth/validation';

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function setup(handler: (req: Request) => Response | Promise<Response>) {
  const data = new Map<string, string>();
  const storage: SecureStorage = {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    deleteItem: async (k) => void data.delete(k),
  };
  const store = createTokenStore(storage);
  const session = createSession({ store, refreshFn: jest.fn(), onSignedOut: jest.fn() });
  const client = createApiClient({ baseUrl: 'https://api.test', session, fetch: (async (r: Request) => handler(r)) as never });
  return { service: createAuthService(client, session), store };
}

describe('auth service', () => {
  it('signs in and stores the tokens', async () => {
    const { service, store } = setup(() => json(200, { accessToken: 'a', refreshToken: 'r', accessTokenExpiresIn: 900 }));
    expect(await service.signIn('a@b.co', 'pw')).toEqual({ ok: true });
    expect((await store.read())?.refreshToken).toBe('r');
  });

  it('wrong credentials: one banner, clear the password, store nothing', async () => {
    const { service, store } = setup(() => json(401, { code: 'invalid_credentials', message: 'x' }));
    const out = await service.signIn('a@b.co', 'pw');
    expect(out).toMatchObject({ ok: false, clearPassword: true, presentation: { kind: 'banner', message: 'Email or password is incorrect.' } });
    expect(await store.read()).toBeNull();
  });

  it('maps a network failure to the offline copy for the context', async () => {
    const { service } = setup(() => {
      throw new TypeError('Network request failed');
    });
    expect(await service.signIn('a@b.co', 'pw')).toMatchObject({
      ok: false,
      presentation: { tone: 'warning', message: "You're offline. Connect to the internet to sign in." },
    });
    expect(await service.requestReset('a@b.co')).toMatchObject({
      presentation: { message: "You're offline. Connect to the internet to reset your password." },
    });
  });

  it('treats 429 without a body as rate limited and 5xx as generic', async () => {
    expect(await setup(() => json(429)).service.requestReset('a@b.co')).toMatchObject({
      presentation: { message: 'Too many requests. Try again in a few minutes.' },
    });
    expect(await setup(() => json(500)).service.signIn('a@b.co', 'pw')).toMatchObject({
      presentation: { message: 'Something went wrong on our side. Try again.' },
    });
  });

  it('reset request succeeds on 202; confirm maps invalid_code and code_locked', async () => {
    expect(await setup(() => json(202)).service.requestReset('a@b.co')).toEqual({ ok: true });
    expect(await setup(() => json(204)).service.confirmReset('a@b.co', '123456', 'long-enough-pw')).toEqual({ ok: true });
    expect(await setup(() => json(400, { code: 'invalid_code', message: '' })).service.confirmReset('a@b.co', '123456', 'x')).toMatchObject({
      presentation: { kind: 'fields', fields: [{ field: 'code' }] },
    });
    expect(await setup(() => json(400, { code: 'code_locked', message: '' })).service.confirmReset('a@b.co', '123456', 'x')).toMatchObject({
      presentation: { kind: 'banner', primaryAction: 'resendCode' },
    });
  });
});

describe('validation', () => {
  it('email', () => {
    expect(validateEmail('')).toBe('Enter your email.');
    expect(validateEmail('nope')).toBe("That doesn't look like an email address.");
    expect(validateEmail(' a@b.co ')).toBeUndefined();
  });
  it('new password and code', () => {
    expect(validateNewPassword('short')).toBe('Use at least 10 characters.');
    expect(validateNewPassword('x'.repeat(129))).toBe('Use 128 characters or fewer.');
    expect(validateNewPassword('x'.repeat(10))).toBeUndefined();
    expect(validateResetCode('12345')).toBeDefined();
    expect(validateResetCode('123456')).toBeUndefined();
  });
});
