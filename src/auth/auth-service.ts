import type { components } from '@/api/schema';
import type { createApiClient } from '@/api/client';

import { presentAuthError, presentOffline, shouldClearPassword, type AuthContext, type ErrorPresentation } from './error-copy';
import type { Session } from './session';

type ApiClient = ReturnType<typeof createApiClient>;
type ApiError = components['schemas']['Error'];

export type Outcome = { ok: true } | { ok: false; presentation: ErrorPresentation; clearPassword: boolean };

const fail = (presentation: ErrorPresentation, clearPassword = false): Outcome => ({ ok: false, presentation, clearPassword });

/** The body is untyped on the wire; fall back to a code derived from the status. */
function toApiError(body: unknown, status: number): ApiError {
  if (body && typeof body === 'object' && 'code' in body) return body as ApiError;
  return { code: status === 429 ? 'rate_limited' : 'internal_error', message: '' };
}

/** fetch rejects only when no response arrived (offline, DNS, timeout), so any throw is "offline". */
async function run(context: AuthContext, call: () => Promise<{ error?: unknown; response: Response }>): Promise<Outcome> {
  let result;
  try {
    result = await call();
  } catch {
    return fail(presentOffline(context));
  }
  if (!result.error && result.response.ok) return { ok: true };
  const apiError = toApiError(result.error, result.response.status);
  return fail(presentAuthError(apiError, context), shouldClearPassword(apiError, context));
}

export function createAuthService(client: ApiClient, session: Session) {
  return {
    async signIn(email: string, password: string): Promise<Outcome> {
      let tokens: components['schemas']['AuthTokens'] | undefined;
      const outcome = await run('signIn', async () => {
        const res = await client.POST('/auth/login', { body: { email, password } });
        tokens = res.data;
        return res;
      });
      if (!outcome.ok) return outcome;
      if (!tokens) return fail(presentAuthError({ code: 'internal_error', message: '' }, 'signIn'));
      await session.signIn(tokens);
      return outcome;
    },
    requestReset(email: string): Promise<Outcome> {
      return run('resetRequest', () => client.POST('/auth/password-reset/request', { body: { email } }));
    },
    confirmReset(email: string, code: string, newPassword: string): Promise<Outcome> {
      return run('resetConfirm', () =>
        client.POST('/auth/password-reset/confirm', { body: { email, code, newPassword } }),
      );
    },
  };
}
export type AuthService = ReturnType<typeof createAuthService>;
