// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  replaysSessionSampleRate: 0.1,

  // If you don't want to use Session Replay, just remove the line below:
  replaysOnErrorSampleRate: 1.0,

  // Disable sending PII (personally identifiable information)
  sendDefaultPii: false,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // You can add additional configuration options here
  integrations: [
    Sentry.replayIntegration({
      // Additional SDK configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
