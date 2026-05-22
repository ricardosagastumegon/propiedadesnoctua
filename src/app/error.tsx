"use client"
import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, Home, RotateCcw } from "lucide-react"

const IS_DEV = process.env.NODE_ENV === "development"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GlobalError]", error)
    // Reportar a Sentry si está configurado (lazy import — no falla en dev sin Sentry)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/nextjs").then(Sentry => {
        Sentry.captureException(error, { tags: { boundary: "global" } })
      }).catch(() => {})
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex p-4 rounded-full bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl tracking-tight">Algo salió mal</h1>
          <p className="text-sm text-muted-foreground">
            Hubo un problema procesando tu solicitud. Volvé a intentarlo o regresá al dashboard.
          </p>
        </div>

        {IS_DEV && error?.message && (
          <pre className="text-left text-xs bg-muted p-3 rounded-md overflow-auto max-h-48 border">
            <strong>{error.name}</strong>: {error.message}
            {error.digest && <div className="text-muted-foreground mt-1">digest: {error.digest}</div>}
            {error.stack && <div className="mt-2 opacity-70">{error.stack}</div>}
          </pre>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="size-4" /> Intentar de nuevo
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Home className="size-4" /> Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
