// Observability wrapper. Reporta a Sentry si está configurado, siempre loguea
// a console.error con un prefijo estable para grep en logs de Vercel.

const SENTRY_ENABLED = !!process.env.NEXT_PUBLIC_SENTRY_DSN

export interface ErrorContext {
  /** Tag operativo para agrupar en Sentry: "payment", "acceptance", "auth", etc. */
  area?: string
  /** Información extra que ayuda a debuggear (sin PII). */
  extra?: Record<string, unknown>
  /** organizationId / userId si está disponible. */
  orgId?: string
  userId?: string
}

export function logError(error: unknown, ctx: ErrorContext = {}): void {
  const err = error instanceof Error ? error : new Error(String(error))
  const area = ctx.area ?? "unknown"

  // Siempre console.error para tener trace en logs de Vercel
  console.error(`[${area}]`, err.message, ctx.extra ?? {})
  if (process.env.NODE_ENV !== "production" && err.stack) {
    console.error(err.stack)
  }

  // Sentry (lazy import — solo en runtime, no fail si no está instalado)
  if (SENTRY_ENABLED) {
    void reportToSentry(err, ctx)
  }
}

async function reportToSentry(err: Error, ctx: ErrorContext): Promise<void> {
  try {
    const Sentry = await import("@sentry/nextjs")
    Sentry.withScope(scope => {
      if (ctx.area) scope.setTag("area", ctx.area)
      if (ctx.orgId) scope.setTag("orgId", ctx.orgId)
      if (ctx.userId) scope.setUser({ id: ctx.userId })
      if (ctx.extra) scope.setContext("extra", ctx.extra as Record<string, unknown>)
      Sentry.captureException(err)
    })
  } catch {
    // No-op: si Sentry no está disponible o falla, ya logueamos en console
  }
}

/** Para usar como wrapper en server actions críticas. */
export async function withErrorReporting<T>(
  area: string,
  fn: () => Promise<T>,
  ctxBuilder?: () => ErrorContext,
): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    logError(e, { area, ...(ctxBuilder?.() ?? {}) })
    throw e
  }
}
