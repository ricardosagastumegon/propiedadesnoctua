// Sentry client-side config. Captures unhandled errors in the browser.
// Only initializes if NEXT_PUBLIC_SENTRY_DSN is set — otherwise no-op (dev sin Sentry).
import * as Sentry from "@sentry/nextjs"

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    replaysSessionSampleRate: 0, // session replay opt-in cuando quieras
    replaysOnErrorSampleRate: 0.1,
    // No mandar PII por defecto
    sendDefaultPii: false,
  })
}
