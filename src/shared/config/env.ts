/** Backend origin. Set EXPO_PUBLIC_API_URL per environment; never a secret. */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
