import { presentAuthError, presentOffline, shouldClearPassword } from './error-copy';
import type { components } from './schema';

type ErrorCode = components['schemas']['ErrorCode'];

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
