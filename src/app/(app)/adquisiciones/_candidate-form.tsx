"use client"
import { useState, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PROPERTY_TYPES, DEPARTMENTS } from "@/lib/schemas/property"
import { AREA_UNITS, CUERDA_SIZES, type AreaUnit } from "@/lib/varas"
import { CoordPicker } from "../propiedades/_components/coord-picker"
import { compressImage } from "@/lib/compress-image"
import { Button } from "@/components/ui/button"
import { createCandidateManual, updateCandidateInfo } from "./actions"
import { CategoryPicker } from "./_category-picker"

export interface CandidateInitial {
  id: string
  title: string; propertyType: string | null; department: string | null; city: string | null; zone: string | null
  addressLine: string | null; cadastralNumber: string | null; price: number | null; currency: string
  bedrooms: number | null; bathrooms: number | null; area: number | null; areaUnit: string | null; cuerdaVaras: number | null
  description: string | null; galleryUrls: string[]; documentUrls: string[]; categories: string[]
  mapPolygon: unknown; latitude: number | null; longitude: number | null
}

export function CandidateForm({ initial }: { initial?: CandidateInitial }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [gallery, setGallery] = useState<string[]>(initial?.galleryUrls ?? [])
  const [documents, setDocuments] = useState<string[]>(initial?.documentUrls ?? [])
  const [upl, setUpl] = useState<"" | "photo" | "doc">("")
  const [areaUnit, setAreaUnit] = useState<AreaUnit>((initial?.areaUnit as AreaUnit) ?? "V2")

  async function upload(files: File[], setter: (u: string[]) => void, kind: "photo" | "doc") {
    setUpl(kind); setError(null)
    const urls: string[] = []
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append("file", await compressImage(file)); fd.append("type", "acquisitions")
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        if (!res.ok) { let m = "No se pudo subir."; try { const j = await res.json(); if (j?.error) m = j.error } catch { /* */ } setError(m); break }
        const j = await res.json().catch(() => ({})); if (j.url) urls.push(j.url)
      }
    } catch { setError("Error al subir.") } finally { if (urls.length) setter(urls); setUpl("") }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    const fd = new FormData(formRef.current!)
    fd.set("galleryUrls", JSON.stringify(gallery)); fd.set("documentUrls", JSON.stringify(documents))
    start(async () => {
      const res = initial ? await updateCandidateInfo(initial.id, fd) : await createCandidateManual(fd)
      if (res && "error" in res) { setError(res.error); return }
      if (res && "redirectTo" in res) router.push(res.redirectTo)
      else { router.push(`/adquisiciones/${initial!.id}`); router.refresh() }
    })
  }

  const inp = "w-full rounded-lg border px-3 py-2 text-sm bg-background"
  const lbl = "block text-sm font-medium mb-1"

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5 max-w-3xl">
      <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-3">
        <div><label className={lbl}>Título / nombre *</label><input name="title" defaultValue={initial?.title} required placeholder="Ej: Terreno 5 cuerdas Malacatán" className={inp} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Tipo</label>
            <select name="propertyType" defaultValue={initial?.propertyType ?? ""} className={inp}>
              <option value="">—</option>
              {Object.entries(PROPERTY_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div><label className={lbl}>Departamento</label>
            <select name="department" defaultValue={initial?.department ?? ""} className={inp}>
              <option value="">—</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select></div>
          <div><label className={lbl}>Ciudad / municipio</label><input name="city" defaultValue={initial?.city ?? ""} className={inp} /></div>
          <div><label className={lbl}>Zona / colonia</label><input name="zone" defaultValue={initial?.zone ?? ""} className={inp} /></div>
        </div>
        <div><label className={lbl}>Dirección / referencia</label><input name="addressLine" defaultValue={initial?.addressLine ?? ""} className={inp} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><label className={lbl}>Precio</label><input name="price" type="number" step="0.01" defaultValue={initial?.price ?? ""} className={inp} /></div>
          <div><label className={lbl}>Moneda</label>
            <select name="currency" defaultValue={initial?.currency ?? "GTQ"} className={inp}><option value="GTQ">Q (GTQ)</option><option value="USD">$ (USD)</option></select></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><label className={lbl}>Hab.</label><input name="bedrooms" type="number" defaultValue={initial?.bedrooms ?? ""} className={inp} /></div>
          <div><label className={lbl}>Baños</label><input name="bathrooms" type="number" defaultValue={initial?.bathrooms ?? ""} className={inp} /></div>
          <div><label className={lbl}>Área</label><input name="area" type="number" step="any" defaultValue={initial?.area ?? ""} className={inp} /></div>
          <div><label className={lbl}>Unidad</label>
            <select name="areaUnit" value={areaUnit} onChange={e => setAreaUnit(e.target.value as AreaUnit)} className={inp}>
              {AREA_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select></div>
        </div>
        {areaUnit === "CUERDA" && (
          <div><label className={lbl}>Tamaño cuerda</label>
            <select name="cuerdaVaras" defaultValue={initial?.cuerdaVaras ?? 25} className={inp}>
              {CUERDA_SIZES.map(c => <option key={c.varas} value={c.varas}>{c.label}</option>)}
            </select></div>
        )}
        <div><label className={lbl}>Catastro (RIC)</label><input name="cadastralNumber" defaultValue={initial?.cadastralNumber ?? ""} className={inp} /></div>
        <div>
          <label className={lbl}>Etiquetas (para qué sirve / ideal para)</label>
          <CategoryPicker initial={initial?.categories ?? []} />
        </div>
        <div><label className={lbl}>Descripción</label><textarea name="description" rows={2} defaultValue={initial?.description ?? ""} className={inp} /></div>
      </div>

      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <label className={lbl}>Ubicación en el mapa (polígono / coordenadas)</label>
        <CoordPicker initialPolygon={initial?.mapPolygon} initialLat={initial?.latitude} initialLon={initial?.longitude} />
      </div>

      <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-3">
        <div>
          <label className={lbl}>Fotos</label>
          <div className="flex flex-wrap gap-2">
            {gallery.map((u, i) => (
              <div key={i} className="relative"><img src={u} alt="" className="w-20 h-16 object-cover rounded-lg border" />
                <button type="button" onClick={() => setGallery(g => g.filter((_, x) => x !== i))} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 text-xs">×</button></div>
            ))}
            <label className="w-20 h-16 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground cursor-pointer hover:bg-muted/40">
              {upl === "photo" ? "…" : "+ Foto"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => upload(Array.from(e.target.files ?? []), us => setGallery(p => [...p, ...us].slice(0, 12)), "photo")} />
            </label>
          </div>
        </div>
        <div>
          <label className={lbl}>Documentos de municipalidad</label>
          <div className="flex flex-wrap gap-2">
            {documents.map((u, i) => (
              <div key={i} className="relative"><a href={u} target="_blank" rel="noopener noreferrer" className="flex items-center bg-muted/40 border rounded-lg px-3 py-2 text-xs">📄 Doc {i + 1}</a>
                <button type="button" onClick={() => setDocuments(d => d.filter((_, x) => x !== i))} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 text-xs">×</button></div>
            ))}
            <label className="border border-dashed rounded-lg px-3 py-2 flex items-center text-xs text-muted-foreground cursor-pointer hover:bg-muted/40">
              {upl === "doc" ? "…" : "+ Documento"}
              <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => upload(Array.from(e.target.files ?? []), us => setDocuments(p => [...p, ...us].slice(0, 12)), "doc")} />
            </label>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : initial ? "Guardar cambios" : "Agregar propiedad"}</Button>
      </div>
    </form>
  )
}
