"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createOrganizationWithOwner } from "./actions"

type FieldErrors = Record<string, string[]>

export function SignupForm() {
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [topError, setTopError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setTopError(null)
    setLoading(true)

    const fd = new FormData(ref.current!)
    const res = await createOrganizationWithOwner(fd)
    setLoading(false)

    if (res?.error) {
      if (typeof res.error === "string") setTopError(res.error)
      else setErrors(res.error as FieldErrors)
      return
    }
    if (res?.redirectTo) router.push(res.redirectTo)
  }

  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-5">
      <div>
        <h2 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">Tu empresa</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Nombre de la organización *</Label>
            <Input id="orgName" name="orgName" required autoComplete="organization" />
            {errors.orgName && <p className="text-xs text-destructive">{errors.orgName[0]}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="orgType">Tipo</Label>
              <select id="orgType" name="orgType" defaultValue="FAMILY"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value="FAMILY">Familia</option>
                <option value="COMPANY">Empresa</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxId">NIT (opcional)</Label>
              <Input id="taxId" name="taxId" placeholder="CF" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">Administrador</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="adminName">Nombre completo *</Label>
            <Input id="adminName" name="adminName" required autoComplete="name" />
            {errors.adminName && <p className="text-xs text-destructive">{errors.adminName[0]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adminEmail">Correo electrónico *</Label>
            <Input id="adminEmail" name="adminEmail" type="email" required autoComplete="email" />
            {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail[0]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adminPhone">Teléfono (opcional)</Label>
            <Input id="adminPhone" name="adminPhone" autoComplete="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adminPassword">Contraseña *</Label>
            <Input id="adminPassword" name="adminPassword" type="password" required minLength={10} autoComplete="new-password" />
            <p className="text-xs text-muted-foreground">Mínimo 10 caracteres.</p>
            {errors.adminPassword && <p className="text-xs text-destructive">{errors.adminPassword[0]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adminPasswordConfirm">Confirmar contraseña *</Label>
            <Input id="adminPasswordConfirm" name="adminPasswordConfirm" type="password" required minLength={10} autoComplete="new-password" />
            {errors.adminPasswordConfirm && <p className="text-xs text-destructive">{errors.adminPasswordConfirm[0]}</p>}
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="acceptTerms" required className="mt-1" />
        <span className="text-muted-foreground">
          Acepto los términos del servicio y la política de privacidad de Noctua Propiedades.
        </span>
      </label>
      {errors.acceptTerms && <p className="text-xs text-destructive">{errors.acceptTerms[0]}</p>}

      {topError && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3">
          {topError}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creando cuenta…" : "Crear empresa y empezar"}
      </Button>
    </form>
  )
}
