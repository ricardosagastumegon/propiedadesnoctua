"use client"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { MoneyInput } from "@/components/ui/money-input"
import { PROPERTY_TYPES, PROPERTY_STATUSES, DEPARTMENTS } from "@/lib/schemas/property"
import { CoordPicker } from "./coord-picker"
import { compressImage } from "@/lib/compress-image"
import type { Property } from "@prisma/client"

interface Props {
  property?: Property
  action: (formData: FormData) => Promise<any>
  submitLabel?: string
}

export function PropertyForm({ property, action, submitLabel = "Guardar" }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [type, setType] = useState(property?.type ?? "HOUSE")
  const [status, setStatus] = useState(property?.status ?? "AVAILABLE")
  const [department, setDepartment] = useState(property?.department ?? "Guatemala")
  const [coverUrl, setCoverUrl] = useState(property?.coverImageUrl ?? "")
  const [uploading, setUploading] = useState(false)
  const [gallery, setGallery] = useState<string[]>(property?.galleryUrls ?? [])
  const [galleryUploading, setGalleryUploading] = useState(false)

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget
    const file = inputEl.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", await compressImage(file))
      fd.append("type", "properties")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const json = await res.json().catch(() => ({}))
      if (json.url) setCoverUrl(json.url)
      else toast.error(json.error || "No se pudo subir la imagen (probá con una más liviana).")
    } catch {
      toast.error("No se pudo subir la imagen.")
    } finally {
      setUploading(false)
      inputEl.value = ""
    }
  }

  async function uploadGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget
    const files = Array.from(inputEl.files ?? [])
    if (files.length === 0) return
    setGalleryUploading(true)
    const urls: string[] = []
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append("file", await compressImage(file))
        fd.append("type", "properties")
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        if (!res.ok) {
          let msg = "No se pudo subir una foto (probá con una más liviana)."
          try { const j = await res.json(); if (j?.error) msg = j.error } catch { /* no-JSON */ }
          toast.error(msg); break
        }
        const json = await res.json().catch(() => ({}))
        if (json.url) urls.push(json.url)
      }
    } catch {
      toast.error("No se pudieron subir las fotos.")
    } finally {
      if (urls.length) setGallery(prev => [...prev, ...urls])
      setGalleryUploading(false)
      inputEl.value = ""
    }
  }

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    const fd = new FormData(formRef.current!)
    fd.set("type", type)
    fd.set("status", status)
    fd.set("department", department)
    if (coverUrl) fd.set("coverImageUrl", coverUrl)
    fd.set("galleryUrls", JSON.stringify(gallery))
    startTransition(async () => {
      const res = await action(fd)
      if (res?.error) {
        const errs = (typeof res.error === "object" && res.error !== null) ? res.error as Record<string, string[]> : {}
        setFieldErrors(errs)
        const fieldList = Object.entries(errs).map(([k, v]) => `${k}: ${v?.join(", ") ?? "inválido"}`).join(" · ")
        toast.error(fieldList || "Verifica los campos e intenta de nuevo.")
      } else if (res?.redirectTo) {
        router.push(res.redirectTo)
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Cover image */}
      <Card className="p-5">
        <Label className="mb-3 block">Imagen de portada</Label>
        <div className="flex items-start gap-4">
          {coverUrl ? (
            <img src={coverUrl} className="w-32 h-24 rounded-lg object-cover border" alt="portada" />
          ) : (
            <div className="w-32 h-24 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">Sin foto</div>
          )}
          <div>
            <input type="file" accept="image/*" className="hidden" id="cover-input" onChange={uploadImage} />
            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("cover-input")?.click()} disabled={uploading}>
              {uploading ? "Subiendo..." : "Subir foto"}
            </Button>
            {coverUrl && <Button type="button" variant="ghost" size="sm" className="ml-2 text-destructive" onClick={() => setCoverUrl("")}>Quitar</Button>}
          </div>
        </div>
        <input type="hidden" name="coverImageUrl" value={coverUrl} />

        {/* Galería de fotos (para fichas inmobiliarias) */}
        <div className="mt-5 pt-5 border-t">
          <Label className="mb-1 block">Galería de fotos</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Subí varias fotos (recomendado 3 o más para fichas inmobiliarias). Aparecen en el link público.
          </p>
          <div className="flex flex-wrap gap-3">
            {gallery.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt={`foto ${i + 1}`} className="w-24 h-20 rounded-lg object-cover border" />
                <button
                  type="button"
                  onClick={() => setGallery(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow"
                  title="Quitar"
                >×</button>
              </div>
            ))}
            <input type="file" accept="image/*" multiple className="hidden" id="gallery-input" onChange={uploadGallery} />
            <button
              type="button"
              onClick={() => document.getElementById("gallery-input")?.click()}
              disabled={galleryUploading}
              className="w-24 h-20 rounded-lg border border-dashed flex flex-col items-center justify-center text-xs text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
            >
              {galleryUploading ? "Subiendo…" : "+ Agregar"}
            </button>
          </div>
        </div>
      </Card>

      {/* General info */}
      <Card className="p-5 space-y-4">
        <h3 className="font-display text-base">Informacion general</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" defaultValue={property?.name} required />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name.join(", ")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="alias">Alias</Label>
            <Input id="alias" name="alias" defaultValue={property?.alias ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PROPERTY_TYPES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PROPERTY_STATUSES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" name="notes" defaultValue={property?.notes ?? ""} rows={3} />
        </div>
      </Card>

      {/* Address */}
      <Card className="p-5 space-y-4">
        <h3 className="font-display text-base">Ubicacion</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="addressLine">Direccion *</Label>
            <Input id="addressLine" name="addressLine" defaultValue={property?.addressLine} required />
            {fieldErrors.addressLine && <p className="text-xs text-destructive">{fieldErrors.addressLine.join(", ")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone">Zona / Colonia</Label>
            <Input id="zone" name="zone" defaultValue={property?.zone ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad *</Label>
            <Input id="city" name="city" defaultValue={property?.city ?? "Guatemala"} required />
            {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city.join(", ")}</p>}
          </div>
          <div className="space-y-2">
            <Label>Departamento *</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Codigo postal</Label>
            <Input id="postalCode" name="postalCode" defaultValue={property?.postalCode ?? ""} />
          </div>
        </div>

        {/* Ubicación en el mapa */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-1">Ubicación en el mapa</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Marcá dónde está la propiedad para que aparezca en el mapa de propiedades.
          </p>
          <CoordPicker initialLat={property?.latitude} initialLon={property?.longitude} initialPolygon={property?.mapPolygon} />
        </div>
      </Card>

      {/* Physical attributes */}
      <Card className="p-5 space-y-4">
        <h3 className="font-display text-base">Caracteristicas fisicas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { id: "bedrooms", label: "Habitaciones", val: property?.bedrooms },
            { id: "bathrooms", label: "Banos", val: property?.bathrooms },
            { id: "parkingSpaces", label: "Parqueos", val: property?.parkingSpaces },
            { id: "yearBuilt", label: "Ano construccion", val: property?.yearBuilt },
            { id: "builtArea", label: "Area construida (m2)", val: property?.builtArea },
            { id: "totalArea", label: "Area total (m2)", val: property?.totalArea },
          ].map(({ id, label, val }) => (
            <div key={id} className="space-y-2">
              <Label htmlFor={id}>{label}</Label>
              <Input id={id} name={id} type="number" step="any" defaultValue={val ?? ""} />
            </div>
          ))}
        </div>
      </Card>

      {/* Financial */}
      <Card className="p-5 space-y-4">
        <h3 className="font-display text-base">Datos financieros</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="acquisitionDate">Fecha de adquisicion</Label>
            <Input id="acquisitionDate" name="acquisitionDate" type="date"
              defaultValue={property?.acquisitionDate ? new Date(property.acquisitionDate).toISOString().split("T")[0] : ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acquisitionCost">Costo de adquisicion (Q)</Label>
            <Input id="acquisitionCost" name="acquisitionCost" type="number" step="0.01" defaultValue={property?.acquisitionCost ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentValue">Valor actual (Q)</Label>
            <Input id="currentValue" name="currentValue" type="number" step="0.01" defaultValue={property?.currentValue ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyTaxYear">IUSI anual (Q)</Label>
            <Input id="propertyTaxYear" name="propertyTaxYear" type="number" step="0.01" defaultValue={property?.propertyTaxYear ?? ""} />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Guardando..." : submitLabel}</Button>
      </div>
    </form>
  )
}
