import Link from "next/link"
import { Compass, Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex p-4 rounded-full bg-muted">
          <Compass className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-5xl tracking-tight">404</h1>
          <h2 className="font-display text-xl tracking-tight">Página no encontrada</h2>
          <p className="text-sm text-muted-foreground">
            La página que buscás no existe o fue movida.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Home className="size-4" /> Volver al dashboard
        </Link>
      </div>
    </div>
  )
}
