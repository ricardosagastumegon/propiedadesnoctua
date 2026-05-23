"use client"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset } from "./actions"

export function RecuperarForm() {
  const ref = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(ref.current!)
    const res = await requestPasswordReset(fd)
    setLoading(false)
    if (res?.error) setError(res.error)
    else setDone(true)
  }

  if (done) {
    return (
      <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-4">
        Si el correo existe en nuestro sistema, te enviamos un email con instrucciones para restablecer tu contraseña.
        Revisá tu bandeja de entrada y la carpeta de spam. El enlace expira en 1 hora.
      </div>
    )
  }

  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Enviando…" : "Enviar enlace de recuperación"}
      </Button>
    </form>
  )
}
