import { createApiClient } from '@/shared/api';

import { signIn } from './sign-in';

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function clientFor(handler: (req: Request) => Response) {
  const session = { getAccessToken: async () => null, refresh: async () => null };
  return createApiClient({ baseUrl: 'https://api.test', session, fetch: (async (r: Request) => handler(r)) as never });
}

describe('signIn', () => {
  it('returns the tokens', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', accessTokenExpiresIn: 900 };
    expect(await signIn(clientFor(() => json(200, tokens)), 'a@b.co', 'pw')).toEqual({ ok: true, data: tokens });
  });

  it('wrong credentials: one banner, clear the password', async () => {
    const out = await signIn(clientFor(() => json(401, { code: 'invalid_credentials', message: 'x' })), 'a@b.co', 'pw');
    expect(out).toMatchObject({
      ok: false,
      clearPassword: true,
      presentation: { kind: 'banner', message: 'Email or password is incorrect.' },
    });
  });

  it('a 200 without tokens is an error, never a signed-in user', async () => {
    expect(await signIn(clientFor(() => json(200)), 'a@b.co', 'pw')).toMatchObject({ ok: false });
  });
});
