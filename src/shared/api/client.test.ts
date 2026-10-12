import { createApiClient, isAuthRoute, type TokenSource } from './client';

function setup(handler: (req: Request) => Response | Promise<Response>, signedIn = true) {
  let token: string | null = signedIn ? 'old' : null;
  const refresh = jest.fn(async () => {
    token = 'new';
    return token;
  });
  const session: TokenSource = { getAccessToken: async () => token, refresh };
  const calls: Request[] = [];
  const fetchMock = jest.fn(async (input: Request) => {
    calls.push(input.clone());
    return handler(input);
  });
  const client = createApiClient({ baseUrl: 'https://api.test', session, fetch: fetchMock as never });
  return { client, refresh, calls };
}

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api client', () => {
  it('sends the bearer token and replays once after a 401', async () => {
    const { client, refresh, calls } = setup((req) =>
      req.headers.get('Authorization') === 'Bearer new' ? json(200, {}) : json(401, { code: 'unauthorized' }),
    );
    const { response } = await client.GET('/me');
    expect(response.status).toBe(200);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.headers.get('Authorization'))).toEqual(['Bearer old', 'Bearer new']);
  });

  it('does not attach a token or refresh on /auth routes', async () => {
    const { client, refresh, calls } = setup(() => json(401, { code: 'invalid_credentials' }));
    const { response } = await client.POST('/auth/login', { body: { email: 'a@b.co', password: 'x' } });
    expect(response.status).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
    expect(calls[0].headers.get('Authorization')).toBeNull();
  });

  it('returns the 401 when the session is gone', async () => {
    const { client } = setup(() => json(401, { code: 'unauthorized' }), false);
    const { response } = await client.GET('/me');
    expect(response.status).toBe(401);
  });
});

describe('empty responses', () => {
  it('accepts 202 and 204 even when Content-Length is missing', async () => {
    const noHeader = () => new Response('', { status: 202 }); // no Content-Length, like RN on Android
    const { client } = setup(noHeader, false);
    const { response, error } = await client.POST('/auth/password-reset/request', { body: { email: 'a@b.co' } });
    expect(response.status).toBe(202);
    expect(error).toBeUndefined();
  });
});

describe('isAuthRoute', () => {
  it('ignores the base URL path prefix', () => {
    expect(isAuthRoute('https://x.test/auth/login', 'https://x.test')).toBe(true);
    expect(isAuthRoute('https://x.test/api/v1/auth/login', 'https://x.test/api/v1/')).toBe(true);
    expect(isAuthRoute('https://x.test/api/v1/me', 'https://x.test/api/v1')).toBe(false);
  });
});
