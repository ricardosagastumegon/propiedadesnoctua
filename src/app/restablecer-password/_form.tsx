"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { applyPasswordReset } from "./actions"

export function RestablecerForm({ token }: { token: string }) {
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(ref.current!)
    const res = await applyPasswordReset({
      token,
      newPassword: fd.get("newPassword") as string,
      confirm: fd.get("confirm") as string,
    })
    setLoading(false)
    if (res?.error) setError(res.error)
    else {
      setDone(true)
      setTimeout(() => router.push("/login?reset=ok"), 1500)
    }
  }

  if (done) {
    return (
      <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-4">
        Contraseña actualizada. Redirigiéndote al inicio de sesión…
      </div>
    )
  }

  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nueva contraseña</Label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={10} autoComplete="new-password" autoFocus />
        <p className="text-xs text-muted-foreground">Mínimo 10 caracteres.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar contraseña</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Guardando…" : "Guardar nueva contraseña"}
      </Button>
      <p className="text-sm text-muted-foreground text-center pt-2">
        <Link href="/recuperar-password" className="hover:underline">Solicitar un enlace nuevo</Link>
      </p>
    </form>
  )
}
