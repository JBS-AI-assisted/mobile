import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/shared/config';

// Deliberately loose: the server decides. This only catches typos before a round trip.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'Enter your email.';
  if (!EMAIL_SHAPE.test(email)) return "That doesn't look like an email address.";
}

/** Sign in has no length rule; old passwords must still work. */
export function validateLoginPassword(value: string): string | undefined {
  if (!value) return 'Enter your password.';
}

export function validateNewPassword(value: string): string | undefined {
  if (!value) return 'Choose a password.';
  if (value.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (value.length > PASSWORD_MAX_LENGTH) return `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`;
}

export function validateResetCode(value: string): string | undefined {
  if (!/^\d{6}$/.test(value)) return 'Enter the 6-digit code.';
}
