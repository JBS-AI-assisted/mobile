import type { components } from './schema';
import { presentAuthError, presentOffline, shouldClearPassword, type AuthContext, type ErrorPresentation } from './error-copy';

type ApiError = components['schemas']['Error'];

export type Outcome<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; presentation: ErrorPresentation; clearPassword: boolean };

export const failure = (presentation: ErrorPresentation, clearPassword = false): Outcome<never> => ({
  ok: false,
  presentation,
  clearPassword,
});

/** The body is untyped on the wire; fall back to a code derived from the status. */
function toApiError(body: unknown, status: number): ApiError {
  if (body && typeof body === 'object' && 'code' in body) return body as ApiError;
  return { code: status === 429 ? 'rate_limited' : 'internal_error', message: '' };
}

/**
 * Runs one API call and turns every way it can fail into an Outcome the UI can render.
 * fetch rejects only when no response arrived (offline, DNS, timeout), so any throw is "offline".
 */
export async function runRequest<T>(
  context: AuthContext,
  call: () => Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<Outcome<T | undefined>> {
  let result;
  try {
    result = await call();
  } catch {
    return failure(presentOffline(context));
  }
  if (!result.error && result.response.ok) return { ok: true, data: result.data };
  const apiError = toApiError(result.error, result.response.status);
  return failure(presentAuthError(apiError, context), shouldClearPassword(apiError, context));
}
