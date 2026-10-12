import { GENERIC_MESSAGE, type ErrorPresentation } from './error-copy';

export interface Feedback {
  banner?: { variant: 'error' | 'warning'; message: string; primaryAction?: 'resendCode' };
  fields: Record<string, string>;
}

/** Flattens an ErrorPresentation into what a form renders. Kinds a form cannot act on become the generic banner. */
export function toFeedback(presentation: ErrorPresentation): Feedback {
  switch (presentation.kind) {
    case 'banner':
      return {
        banner: { variant: presentation.tone, message: presentation.message, primaryAction: presentation.primaryAction },
        fields: {},
      };
    case 'sessionExpired':
      return { banner: { variant: 'error', message: presentation.message }, fields: {} };
    case 'fields':
      return { fields: Object.fromEntries(presentation.fields.map((f) => [f.field, f.message])) };
    default:
      return { banner: { variant: 'error', message: GENERIC_MESSAGE }, fields: {} };
  }
}
