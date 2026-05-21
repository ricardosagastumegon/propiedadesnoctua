"use client"
import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, Home, RotateCcw } from "lucide-react"

const IS_DEV = process.env.NODE_ENV === "development"

export default function AppAreaError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[AppError]", error)
  }, [error])

  return (
    <div className="flex items-center justify-center p-12 min-h-[60vh]">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="inline-flex p-3 rounded-full bg-destructive/10">
          <AlertTriangle className="size-7 text-destructive" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl tracking-tight">Algo salió mal en esta sección</h1>
          <p className="text-sm text-muted-foreground">
            El resto de la aplicación sigue funcionando — sólo esta vista falló.
          </p>
        </div>

        {IS_DEV && error?.message && (
          <pre className="text-left text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 border">
            <strong>{error.name}</strong>: {error.message}
            {error.digest && <div className="text-muted-foreground mt-1">digest: {error.digest}</div>}
          </pre>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-3.5 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="size-3.5" /> Reintentar
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border px-3.5 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Home className="size-3.5" /> Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
