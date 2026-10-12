import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './schema';

/**
 * Auth routes carry no bearer token and never trigger a refresh (a 401 there means bad credentials).
 * Matches on the path after the base URL's own path, so a prefix like /api/v1 still works.
 */
export function isAuthRoute(url: string, baseUrl: string) {
  const prefix = new URL(baseUrl).pathname.replace(/\/+$/, '');
  const path = new URL(url).pathname;
  return (path.startsWith(prefix) ? path.slice(prefix.length) : path).startsWith('/auth/');
}

/**
 * What the client needs from a session. Declared here so `shared` never imports from `entities`;
 * entities/session satisfies it structurally.
 */
export interface TokenSource {
  /** A valid access token, refreshing first if needed. Null when signed out. */
  getAccessToken(): Promise<string | null>;
  /** Force a refresh after a 401. Null if the session ended. */
  refresh(): Promise<string | null>;
}

export interface ApiClientOptions {
  baseUrl: string;
  session: TokenSource;
  fetch?: typeof globalThis.fetch;
}

/**
 * Bearer token on every non-auth request. On 401: refresh once (single-flight, in the session),
 * then replay the request once. If the refresh fails the 401 is returned as is.
 */
export function createAuthMiddleware(session: TokenSource, doFetch: typeof globalThis.fetch, baseUrl: string): Middleware {
  const replayable = new WeakMap<Request, Request>();
  return {
    async onRequest({ request }) {
      if (isAuthRoute(request.url, baseUrl)) return request;
      const token = await session.getAccessToken();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      replayable.set(request, request.clone());
      return request;
    },
    async onResponse({ request, response }) {
      if (response.status !== 401 || isAuthRoute(request.url, baseUrl)) return response;
      const copy = replayable.get(request);
      replayable.delete(request);
      if (!copy) return response;
      const token = await session.refresh();
      if (!token) return response;
      copy.headers.set('Authorization', `Bearer ${token}`);
      return doFetch(copy);
    },
  };
}

export function createApiClient({ baseUrl, session, fetch: fetchImpl }: ApiClientOptions) {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
  const client = createClient<paths>({ baseUrl, fetch: doFetch });
  client.use(createAuthMiddleware(session, doFetch, baseUrl));
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
