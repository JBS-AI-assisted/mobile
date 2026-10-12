import { createContext, useContext } from 'react';

import type { ApiClient } from './client';

/** The app layer provides the client (it owns the session wiring); features read it with `useApi`. */
export const ApiContext = createContext<ApiClient | null>(null);

export function useApi() {
  const client = useContext(ApiContext);
  if (!client) throw new Error('useApi must be used inside the app providers');
  return client;
}
