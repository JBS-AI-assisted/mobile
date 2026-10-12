/**
 * The one place that turns API errors into user-facing copy.
 * Source of truth: the table at the end of docs/design/auth.md (Leo reviews copy here).
 * Map on `code`, never on `message`. Unknown codes fall through to the generic banner.
 */
import type { components } from './schema';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/shared/config';

type ApiError = components['schemas']['Error'];

export type AuthContext = 'signUp' | 'signIn' | 'resetRequest' | 'resetConfirm' | 'deleteAccount';

export interface FieldError {
  field: string;
  message: string;
  /** Secondary action shown with the message, e.g. "Sign in instead". */
  action?: 'signInInstead';
  /** Clear and focus the field (wrong password). */
  clearAndFocus?: boolean;
}

export type ErrorPresentation =
  | { kind: 'banner'; tone: 'error' | 'warning'; message: string; primaryAction?: 'resendCode' }
  | { kind: 'fields'; fields: FieldError[] }
  | { kind: 'underAge' }
  | { kind: 'sessionExpired'; message: string }
  | { kind: 'route'; to: 'onboarding' };

export const GENERIC_MESSAGE = 'Something went wrong on our side. Try again.';

const FIELD_COPY: Record<string, Record<string, string>> = {
  email: {
    required: 'Enter your email.',
    invalid_format: "That doesn't look like an email address.",
  },
  password: {
    required: 'Choose a password.',
    too_short: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    too_long: `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`,
    too_common: 'That password is too common. Choose another.',
  },
  code: {
    required: 'Enter the 6-digit code.',
    invalid_format: 'Enter the 6-digit code.',
  },
};

const generic = (): ErrorPresentation => ({ kind: 'banner', tone: 'error', message: GENERIC_MESSAGE });

function fromValidation(error: ApiError): ErrorPresentation {
  const fields = error.fields ?? [];
  if (fields.some((f) => f.field === 'birthYear' && f.code === 'under_min_age')) {
    return { kind: 'underAge' };
  }
  const mapped: FieldError[] = [];
  for (const { field, code } of fields) {
    const message = FIELD_COPY[field]?.[code];
    if (message) mapped.push({ field, message });
  }
  // A field we have no copy for is a client/server mismatch, not something to show raw.
  return mapped.length > 0 ? { kind: 'fields', fields: mapped } : generic();
}

export function presentAuthError(error: ApiError, context: AuthContext): ErrorPresentation {
  switch (error.code) {
    case 'invalid_credentials':
      return {
        kind: 'banner',
        tone: 'error',
        message: 'Email or password is incorrect.',
      };
    case 'email_taken':
      return {
        kind: 'fields',
        fields: [
          {
            field: 'email',
            message: 'An account with this email already exists.',
            action: 'signInInstead',
          },
        ],
      };
    case 'validation_failed':
      return fromValidation(error);
    case 'invalid_code':
      return {
        kind: 'fields',
        fields: [
          {
            field: 'code',
            message: "That code isn't valid or has expired. Request a new one.",
          },
        ],
      };
    case 'code_locked':
      return {
        kind: 'banner',
        tone: 'error',
        message: 'Too many incorrect codes. Request a new code to continue.',
        primaryAction: 'resendCode',
      };
    case 'rate_limited':
      return {
        kind: 'banner',
        tone: 'error',
        message:
          context === 'resetRequest'
            ? 'Too many requests. Try again in a few minutes.'
            : 'Too many attempts. Try again in a few minutes.',
      };
    case 'invalid_password':
      // Delete account only: a wrong password here is not a sign-out.
      return context === 'deleteAccount'
        ? { kind: 'fields', fields: [{ field: 'password', message: 'Password is incorrect.' }] }
        : generic();
    case 'unauthorized':
    case 'invalid_refresh_token':
      return { kind: 'sessionExpired', message: 'Please sign in again.' };
    case 'profile_not_found':
      return { kind: 'route', to: 'onboarding' };
    case 'internal_error':
    default:
      return generic();
  }
}

/** Sign-in specific: wrong credentials also clear and refocus the password field. */
export function shouldClearPassword(error: ApiError, context: AuthContext) {
  return context === 'signIn' && error.code === 'invalid_credentials';
}

const OFFLINE_COPY: Record<AuthContext, string> = {
  signUp: "You're offline. Connect to the internet to create your account.",
  signIn: "You're offline. Connect to the internet to sign in.",
  resetRequest: "You're offline. Connect to the internet to reset your password.",
  resetConfirm: "You're offline. Connect to the internet to reset your password.",
  deleteAccount: "You're offline. Connect to the internet to delete your account.",
};

export function presentOffline(context: AuthContext): ErrorPresentation {
  return { kind: 'banner', tone: 'warning', message: OFFLINE_COPY[context] };
}
