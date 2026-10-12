import { runRequest, type ApiClient, type Outcome } from '@/shared/api';

export function requestReset(client: ApiClient, email: string): Promise<Outcome<undefined>> {
  return runRequest('resetRequest', () => client.POST('/auth/password-reset/request', { body: { email } }));
}

export function confirmReset(
  client: ApiClient,
  email: string,
  code: string,
  newPassword: string,
): Promise<Outcome<undefined>> {
  return runRequest('resetConfirm', () =>
    client.POST('/auth/password-reset/confirm', { body: { email, code, newPassword } }),
  );
}
