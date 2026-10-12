import { failure, presentAuthError, runRequest, type ApiClient, type components, type Outcome } from '@/shared/api';

type AuthTokens = components['schemas']['AuthTokens'];

export async function signIn(client: ApiClient, email: string, password: string): Promise<Outcome<AuthTokens>> {
  const outcome = await runRequest('signIn', () => client.POST('/auth/login', { body: { email, password } }));
  if (!outcome.ok) return outcome;
  // A 2xx without tokens is a contract mismatch; never pretend the user is signed in.
  if (!outcome.data) return failure(presentAuthError({ code: 'internal_error', message: '' }, 'signIn'));
  return { ok: true, data: outcome.data };
}
