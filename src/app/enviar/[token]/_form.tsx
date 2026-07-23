"use client"
import { useState, useRef, useTransition } from "react"
import { PROPERTY_TYPES, DEPARTMENTS } from "@/lib/schemas/property"
import { submitAcquisition } from "@/app/(app)/adquisiciones/actions"
import { CategoryPicker } from "@/app/(app)/adquisiciones/_category-picker"
import { CoordPicker } from "@/app/(app)/propiedades/_components/coord-picker"
import { compressImage } from "@/lib/compress-image"

export function SubmitForm({ token, orgName, brief }: { token: string; orgName: string; brief?: string | null }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gallery, setGallery] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState<string[]>([])
  const [docUploading, setDocUploading] = useState(false)

  async function uploadPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget
    const files = Array.from(inputEl.files ?? [])
    if (!files.length) return
    setUploading(true)
    setError(null)
    const urls: string[] = []
    try {
      for (const file of files) {
        const compressed = await compressImage(file)
        const fd = new FormData()
        fd.append("file", compressed)
        fd.append("token", token)
        const res = await fetch("/api/upload-public", { method: "POST", body: fd })
        if (!res.ok) {
          let msg = "No se pudo subir una foto (probá con una más liviana)."
          try { const j = await res.json(); if (j?.error) msg = j.error } catch { /* respuesta no-JSON */ }
          setError(msg)
          break
        }
        const json = await res.json().catch(() => ({}))
        if (json.url) urls.push(json.url)
      }
    } catch {
      setError("No se pudieron subir las fotos. Podés enviar la propiedad sin fotos y agregarlas después.")
    } finally {
      // SIEMPRE liberar, pase lo que pase — así el botón nunca queda trabado.
      if (urls.length) setGallery(prev => [...prev, ...urls].slice(0, 12))
      setUploading(false)
      inputEl.value = ""
    }
  }

  async function uploadDocuments(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget
    const files = Array.from(inputEl.files ?? [])
    if (!files.length) return
    setDocUploading(true)
    setError(null)
    const urls: string[] = []
    try {
      for (const file of files) {
        const prepared = await compressImage(file) // PDFs pasan sin cambios
        const fd = new FormData()
        fd.append("file", prepared)
        fd.append("token", token)
        const res = await fetch("/api/upload-public", { method: "POST", body: fd })
        if (!res.ok) {
          let msg = "No se pudo subir el documento (PDF o imagen, más liviano)."
          try { const j = await res.json(); if (j?.error) msg = j.error } catch { /* no-JSON */ }
          setError(msg); break
        }
        const json = await res.json().catch(() => ({}))
        if (json.url) urls.push(json.url)
      }
    } catch {
      setError("No se pudieron subir los documentos.")
    } finally {
      if (urls.length) setDocuments(prev => [...prev, ...urls].slice(0, 12))
      setDocUploading(false)
      inputEl.value = ""
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(formRef.current!)
    fd.set("galleryUrls", JSON.stringify(gallery))
    fd.set("documentUrls", JSON.stringify(documents))
    startTransition(async () => {
      const res = await submitAcquisition(token, fd)
      if ("error" in res) { setError(res.error); return }
      setDone(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9] p-6">
        <div className="max-w-md text-center bg-white rounded-2xl border border-[#E7E9EE] p-8 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl">✓</div>
          <h1 className="font-display text-2xl text-[#12182A] mt-4">¡Enviada!</h1>
          <p className="text-sm text-[#475065] mt-2">Gracias. La propiedad le llegó a <strong>{orgName}</strong> para analizarla. Si les interesa, te contactan.</p>
          <button onClick={() => { setDone(false); setGallery([]); setDocuments([]); formRef.current?.reset() }}
            className="mt-6 text-sm font-semibold text-[#8A6A2E] hover:underline">Enviar otra propiedad</button>
        </div>
      </div>
    )
  }

  const label = "block text-sm font-medium text-[#12182A] mb-1"
  const input = "w-full rounded-lg border border-[#E7E9EE] px-3 py-2.5 text-sm text-[#12182A] focus:outline-none focus:ring-2 focus:ring-[#B68A3E]/40"

  return (
    <div className="min-h-screen bg-[#F6F7F9] py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-[#8A6A2E] text-xs font-semibold tracking-widest uppercase">Enviar propiedad a</div>
          <h1 className="font-display text-3xl text-[#12182A] mt-1">{orgName}</h1>
          <p className="text-sm text-[#475065] mt-2">Completá los datos de la propiedad. Le llega directo para que la analicen.</p>
        </div>

        {brief && brief.trim() && (
          <div className="bg-[#0D1322] text-[#F4EFE6] rounded-2xl p-5 mb-6">
            <div className="text-[10px] uppercase tracking-widest text-[#C9A24B] font-semibold mb-1">Qué están buscando ahora</div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{brief}</p>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot anti-spam (oculto) */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

          <div className="bg-white rounded-2xl border border-[#E7E9EE] p-5 shadow-sm space-y-4">
            <h2 className="font-display text-lg text-[#12182A]">La propiedad</h2>
            <div>
              <label className={label}>Título / nombre *</label>
              <input name="title" required placeholder="Ej: Casa en venta, zona 14" className={input} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Tipo</label>
                <select name="propertyType" className={input} defaultValue="">
                  <option value="">Elegí…</option>
                  {Object.entries(PROPERTY_TYPES).map(([v, l]) => <option key={v} value={v}>{l as string}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Departamento</label>
                <select name="department" className={input} defaultValue="Guatemala">
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Ciudad / municipio</label>
                <input name="city" placeholder="Guatemala" className={input} />
              </div>
              <div>
                <label className={label}>Zona / colonia</label>
                <input name="zone" placeholder="Zona 14" className={input} />
              </div>
            </div>
            <div>
              <label className={label}>Dirección / referencia</label>
              <input name="addressLine" placeholder="Calle, número, punto de referencia" className={input} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={label}>Precio</label>
                <input name="price" type="number" step="0.01" placeholder="0.00" className={input} />
              </div>
              <div>
                <label className={label}>Moneda</label>
                <select name="currency" className={input} defaultValue="GTQ">
                  <option value="GTQ">Q (GTQ)</option>
                  <option value="USD">$ (USD)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className={label}>Habitaciones</label><input name="bedrooms" type="number" className={input} /></div>
              <div><label className={label}>Baños</label><input name="bathrooms" type="number" className={input} /></div>
              <div><label className={label}>Área</label><input name="area" type="number" step="any" className={input} /></div>
              <div><label className={label}>Unidad</label>
                <select name="areaUnit" defaultValue="M2" className={input}>
                  <option value="M2">m²</option>
                  <option value="V2">v² (varas²)</option>
                  <option value="CUERDA">cuerdas</option>
                  <option value="MANZANA">manzanas</option>
                  <option value="HECTAREA">hectáreas</option>
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Etiquetas (para qué sirve / ideal para)</label>
              <CategoryPicker />
            </div>
            <div>
              <label className={label}>Descripción</label>
              <textarea name="description" rows={3} placeholder="Detalles, estado, extras…" className={input} />
            </div>
          </div>

          {/* Ubicación: catastro O dibujo (obligatorio uno) */}
          <div className="bg-white rounded-2xl border border-[#E7E9EE] p-5 shadow-sm space-y-4">
            <div>
              <h2 className="font-display text-lg text-[#12182A]">Ubicación <span className="text-[#A8423F]">*</span></h2>
              <p className="text-xs text-[#6B7280] mt-1">
                <strong>Obligatorio (al menos una):</strong> el <strong>número de catastro</strong>, <em>o</em> dibujá el <strong>polígono</strong> en el mapa, <em>o</em> subí los <strong>documentos de la municipalidad</strong> (plano / escritura).
              </p>
            </div>
            <div>
              <label className={label}>Número de catastro (RIC)</label>
              <input name="cadastralNumber" placeholder="Ej: 18-03-06-00001" className={input} />
            </div>
            <div>
              <label className={label}>Marcá / dibujá el polígono en el mapa</label>
              <p className="text-xs text-[#6B7280] mb-2">
                Pegá coordenadas de Google Maps, o dibujá el contorno (así sabemos dónde queda y el tamaño). Podés activar el <strong>Catastro RIC</strong> arriba a la derecha del mapa.
              </p>
              <CoordPicker />
            </div>
            <div>
              <label className={label}>Documentos de la municipalidad (plano, escritura)</label>
              <p className="text-xs text-[#6B7280] mb-2">PDF o foto. Sirve como ubicación si no tenés catastro ni polígono.</p>
              <div className="flex flex-wrap gap-2">
                {documents.map((url, i) => (
                  <div key={i} className="relative">
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-[#F6F7F9] border rounded-lg px-3 py-2 text-xs text-[#12182A] hover:bg-white">
                      📄 Documento {i + 1}
                    </a>
                    <button type="button" onClick={() => setDocuments(d => d.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 bg-[#A8423F] text-white rounded-full w-5 h-5 text-xs">×</button>
                  </div>
                ))}
                <label className="border border-dashed rounded-lg px-3 py-2 flex items-center text-xs text-[#6B7280] cursor-pointer hover:bg-[#F6F7F9]">
                  {docUploading ? "Subiendo…" : "+ Subir documento"}
                  <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={uploadDocuments} disabled={docUploading} />
                </label>
              </div>
            </div>
          </div>

          {/* Fotos */}
          <div className="bg-white rounded-2xl border border-[#E7E9EE] p-5 shadow-sm">
            <h2 className="font-display text-lg text-[#12182A] mb-1">Fotos</h2>
            <p className="text-xs text-[#6B7280] mb-3">Subí las que tengas (hasta 12).</p>
            <div className="flex flex-wrap gap-2">
              {gallery.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-20 h-16 rounded-lg object-cover border" />
                  <button type="button" onClick={() => setGallery(g => g.filter((_, idx) => idx !== i))}
                    className="absolute -top-2 -right-2 bg-[#A8423F] text-white rounded-full w-5 h-5 text-xs">×</button>
                </div>
              ))}
              <label className="w-20 h-16 rounded-lg border border-dashed flex items-center justify-center text-xs text-[#6B7280] cursor-pointer hover:bg-[#F6F7F9]">
                {uploading ? "…" : "+ Foto"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotos} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Contacto del agente */}
          <div className="bg-white rounded-2xl border border-[#E7E9EE] p-5 shadow-sm space-y-4">
            <h2 className="font-display text-lg text-[#12182A]">Tus datos (para que te contacten)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={label}>Tu nombre</label><input name="agentName" placeholder="Nombre del agente" className={input} /></div>
              <div><label className={label}>Teléfono / WhatsApp</label><input name="agentPhone" placeholder="5xxx-xxxx" className={input} /></div>
            </div>
            <div><label className={label}>Email</label><input name="agentEmail" type="email" placeholder="vos@correo.com" className={input} /></div>
          </div>

          {error && <p className="text-sm text-[#A8423F] text-center">{error}</p>}
          <button type="submit" disabled={pending}
            className="w-full bg-[#12182A] text-[#F4EFE6] font-semibold py-3 rounded-lg hover:bg-[#1B2942] disabled:opacity-60">
            {pending ? "Enviando…" : uploading ? "Enviar propiedad (las fotos siguen subiendo…)" : "Enviar propiedad"}
          </button>
          <p className="text-center text-xs text-[#6B7280]">Al enviar, la propiedad le llega a {orgName}. Noctua · Tu Propiedad</p>
        </form>
      </div>
    </div>
  )
}
