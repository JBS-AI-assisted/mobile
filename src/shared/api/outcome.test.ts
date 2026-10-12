import { runRequest } from './outcome';

const res = (status: number) => new Response(null, { status });

describe('runRequest', () => {
  it('returns the data on success', async () => {
    const out = await runRequest('signIn', async () => ({ data: { id: 1 }, response: res(200) }));
    expect(out).toEqual({ ok: true, data: { id: 1 } });
  });

  it('maps a network failure to the offline copy for the context', async () => {
    const call = async () => {
      throw new TypeError('Network request failed');
    };
    expect(await runRequest('signIn', call)).toMatchObject({
      ok: false,
      presentation: { tone: 'warning', message: "You're offline. Connect to the internet to sign in." },
    });
    expect(await runRequest('resetRequest', call)).toMatchObject({
      presentation: { message: "You're offline. Connect to the internet to reset your password." },
    });
  });

  it('treats 429 without a body as rate limited and 5xx as generic', async () => {
    expect(await runRequest('resetRequest', async () => ({ error: '', response: res(429) }))).toMatchObject({
      presentation: { message: 'Too many requests. Try again in a few minutes.' },
    });
    expect(await runRequest('signIn', async () => ({ error: '', response: res(500) }))).toMatchObject({
      presentation: { message: 'Something went wrong on our side. Try again.' },
    });
  });

  it('maps by code and flags the password to clear on wrong credentials', async () => {
    const out = await runRequest('signIn', async () => ({
      error: { code: 'invalid_credentials', message: 'x' },
      response: res(401),
    }));
    expect(out).toMatchObject({ ok: false, clearPassword: true, presentation: { message: 'Email or password is incorrect.' } });
  });
});
