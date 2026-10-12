import { createApiClient } from '@/shared/api';

import { confirmReset, requestReset } from './password-reset';

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function clientFor(handler: (req: Request) => Response) {
  const session = { getAccessToken: async () => null, refresh: async () => null };
  return createApiClient({ baseUrl: 'https://api.test', session, fetch: (async (r: Request) => handler(r)) as never });
}

describe('password reset api', () => {
  it('request succeeds on 202, confirm on 204', async () => {
    expect(await requestReset(clientFor(() => json(202)), 'a@b.co')).toMatchObject({ ok: true });
    expect(await confirmReset(clientFor(() => json(204)), 'a@b.co', '123456', 'long-enough-pw')).toMatchObject({
      ok: true,
    });
  });

  it('confirm maps invalid_code to a code field error and code_locked to the resend banner', async () => {
    const invalid = clientFor(() => json(400, { code: 'invalid_code', message: '' }));
    expect(await confirmReset(invalid, 'a@b.co', '123456', 'x')).toMatchObject({
      presentation: { kind: 'fields', fields: [{ field: 'code' }] },
    });
    const locked = clientFor(() => json(400, { code: 'code_locked', message: '' }));
    expect(await confirmReset(locked, 'a@b.co', '123456', 'x')).toMatchObject({
      presentation: { kind: 'banner', primaryAction: 'resendCode' },
    });
  });
});
