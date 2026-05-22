"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword } from "./actions"

export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const ref = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const { update } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(ref.current!)
    const res = await changePassword(fd)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setOk(true)
      // CRÍTICO: forzar refresh del JWT para que el middleware vea mustChangePassword=false.
      // Sin esto, el JWT queda con mustChangePassword=true y el middleware re-redirige
      // a /cambiar-password en un loop infinito.
      try { await update() } catch { /* no-op */ }
      if (forced) {
        setTimeout(() => router.push("/dashboard"), 1200)
      }
    }
  }

  if (ok) {
    return (
      <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3">
        Contraseña actualizada. {forced ? "Redirigiendo al dashboard…" : "Listo."}
      </div>
    )
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-3 mt-4">
      <div className="space-y-1.5">
        <Label htmlFor="current">Contraseña actual</Label>
        <Input id="current" name="current" type="password" required autoComplete="current-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPass">Nueva contraseña</Label>
        <Input id="newPass" name="newPass" type="password" required minLength={10} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">Mínimo 10 caracteres. Diferente a la actual.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirmar nueva contraseña</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  )
}
