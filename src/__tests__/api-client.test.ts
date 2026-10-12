import { createApiClient, isAuthRoute } from '@/api/client';
import { createSession } from '@/auth/session';
import { createTokenStore, type SecureStorage } from '@/auth/token-store';

function setup(handler: (req: Request) => Response | Promise<Response>) {
  const data = new Map<string, string>();
  const storage: SecureStorage = {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    deleteItem: async (k) => void data.delete(k),
  };
  const store = createTokenStore(storage);
  const refreshFn = jest.fn(async () => ({ accessToken: 'new', refreshToken: 'r2', accessTokenExpiresIn: 900 }));
  const onSignedOut = jest.fn();
  const session = createSession({ store, refreshFn, onSignedOut });
  const calls: Request[] = [];
  const fetchMock = jest.fn(async (input: Request) => {
    calls.push(input.clone());
    return handler(input);
  });
  const client = createApiClient({ baseUrl: 'https://api.test', session, fetch: fetchMock as never });
  return { client, session, refreshFn, calls };
}

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api client', () => {
  it('sends the bearer token and replays once after a 401', async () => {
    const { client, session, refreshFn, calls } = setup((req) =>
      req.headers.get('Authorization') === 'Bearer new' ? json(200, {}) : json(401, { code: 'unauthorized' }),
    );
    await session.signIn({ accessToken: 'old', refreshToken: 'r1', accessTokenExpiresIn: 900 });
    const { response } = await client.GET('/me');
    expect(response.status).toBe(200);
    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.headers.get('Authorization'))).toEqual(['Bearer old', 'Bearer new']);
  });

  it('does not attach a token or refresh on /auth routes', async () => {
    const { client, session, refreshFn, calls } = setup(() => json(401, { code: 'invalid_credentials' }));
    await session.signIn({ accessToken: 'old', refreshToken: 'r1', accessTokenExpiresIn: 900 });
    const { response } = await client.POST('/auth/login', { body: { email: 'a@b.co', password: 'x' } });
    expect(response.status).toBe(401);
    expect(refreshFn).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
    expect(calls[0].headers.get('Authorization')).toBeNull();
  });

  it('returns the 401 when the session is gone', async () => {
    const { client } = setup(() => json(401, { code: 'unauthorized' }));
    const { response } = await client.GET('/me');
    expect(response.status).toBe(401);
  });
});

describe('isAuthRoute', () => {
  it('ignores the base URL path prefix', () => {
    expect(isAuthRoute('https://x.test/auth/login', 'https://x.test')).toBe(true);
    expect(isAuthRoute('https://x.test/api/v1/auth/login', 'https://x.test/api/v1/')).toBe(true);
    expect(isAuthRoute('https://x.test/api/v1/me', 'https://x.test/api/v1')).toBe(false);
  });
});
