/**
 * Minimum age to create an account. ONE value, never hardcoded elsewhere.
 * 16 per CEO (2026-10-12). May vary by region later.
 * The server is the backstop: it rejects `birthYear/under_min_age`.
 */
export const MIN_AGE = 16;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/** Oldest birth year the contract accepts (BirthYear.minimum). */
export const MIN_BIRTH_YEAR = 1900;

/**
 * Permissive reading, same as the contract: currentYear - birthYear >= MIN_AGE.
 * We only know the year, so someone turning 16 later this year passes.
 */
export function isOldEnough(birthYear: number, now: Date = new Date(), minAge: number = MIN_AGE) {
  return Number.isInteger(birthYear) && now.getFullYear() - birthYear >= minAge;
}

export function isPlausibleBirthYear(birthYear: number, now: Date = new Date()) {
  return Number.isInteger(birthYear) && birthYear >= MIN_BIRTH_YEAR && birthYear <= now.getFullYear();
}

/** Seconds between reset code sends. Must match the backend rate limit (open with the CEO). */
export const RESEND_COOLDOWN_SECONDS = 30;

/** Backend origin. Set EXPO_PUBLIC_API_URL per environment; never a secret. */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
