"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Phone, Mail, Trash2, MapPin } from "lucide-react"
import { updateCandidateStage, updateCandidateAnalysis, deleteCandidate } from "../actions"

interface C {
  id: string; stage: string; title: string; propertyType: string | null
  department: string | null; city: string | null; zone: string | null; addressLine: string | null
  price: number | null; currency: string; bedrooms: number | null; bathrooms: number | null
  area: number | null; description: string | null; galleryUrls: string[]
  agentName: string | null; agentPhone: string | null; agentEmail: string | null
  analysisNotes: string | null; estimatedValue: number | null; offerAmount: number | null
  createdAt: string
}

const STAGES = [
  { key: "NEW", label: "Nueva" },
  { key: "OFFERED", label: "Ofertada" },
  { key: "ACCEPTED", label: "Aceptada" },
  { key: "DISCARDED", label: "Descartada" },
]

function money(n: number | null, c: string) {
  if (n == null) return "—"
  return `${c === "USD" ? "$" : "Q"} ${n.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`
}

export function CandidateDetail({ candidate, canEdit, canDelete }: { candidate: C; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter()
  const [stage, setStage] = useState(candidate.stage)
  const [saving, setSaving] = useState(false)
  const [savingAnalysis, setSavingAnalysis] = useState(false)
  const [notes, setNotes] = useState(candidate.analysisNotes ?? "")
  const [estimated, setEstimated] = useState(candidate.estimatedValue?.toString() ?? "")
  const [offer, setOffer] = useState(candidate.offerAmount?.toString() ?? "")

  async function changeStage(s: string) {
    setStage(s); setSaving(true)
    const res = await updateCandidateStage(candidate.id, s)
    setSaving(false)
    if ("error" in res) { alert(res.error); setStage(candidate.stage); return }
    router.refresh()
  }

  async function saveAnalysis() {
    setSavingAnalysis(true)
    const fd = new FormData()
    fd.set("analysisNotes", notes); fd.set("estimatedValue", estimated); fd.set("offerAmount", offer)
    const res = await updateCandidateAnalysis(candidate.id, fd)
    setSavingAnalysis(false)
    if ("error" in res) { alert(res.error); return }
    router.refresh()
  }

  async function remove() {
    if (!confirm("¿Eliminar esta propiedad candidata?")) return
    const res = await deleteCandidate(candidate.id)
    if ("error" in res) { alert(res.error); return }
    router.push("/adquisiciones")
  }

  const loc = [candidate.zone, candidate.city, candidate.department].filter(Boolean).join(", ")
  const waPhone = candidate.agentPhone?.replace(/[^0-9]/g, "")

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-5">
      <Link href="/adquisiciones" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="size-4" /> Volver a Adquisiciones
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">{candidate.title}</h1>
          {loc && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="size-3.5" />{loc}</p>}
        </div>
        <div className="text-right">
          <div className="font-display text-2xl text-[#12182A]">{money(candidate.price, candidate.currency)}</div>
          <div className="text-xs text-muted-foreground">recibida {new Date(candidate.createdAt).toLocaleDateString("es-GT")}</div>
        </div>
      </div>

      {/* Etapas */}
      <Card className="p-4">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Etapa</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {STAGES.map(s => (
            <Button key={s.key} size="sm" variant={stage === s.key ? "default" : "outline"}
              disabled={!canEdit || saving} onClick={() => changeStage(s.key)}>
              {s.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Fotos */}
      {candidate.galleryUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {candidate.galleryUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt={`foto ${i + 1}`} className="w-full h-28 object-cover rounded-lg border" />
            </a>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Datos */}
        <Card className="p-5 space-y-3">
          <h3 className="font-medium text-sm">Datos de la propiedad</h3>
          <dl className="text-sm space-y-1.5">
            {candidate.propertyType && <Row k="Tipo" v={candidate.propertyType} />}
            <Row k="Habitaciones" v={candidate.bedrooms ?? "—"} />
            <Row k="Baños" v={candidate.bathrooms ?? "—"} />
            <Row k="Área" v={candidate.area ? `${candidate.area} m²` : "—"} />
            {candidate.addressLine && <Row k="Dirección" v={candidate.addressLine} />}
          </dl>
          {candidate.description && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-1">Descripción</div>
              <p className="text-sm whitespace-pre-wrap">{candidate.description}</p>
            </div>
          )}
        </Card>

        {/* Contacto del agente */}
        <Card className="p-5 space-y-3">
          <h3 className="font-medium text-sm">Agente que la envió</h3>
          <div className="text-sm">{candidate.agentName || "Sin nombre"}</div>
          <div className="flex flex-col gap-2">
            {candidate.agentPhone && (
              <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                <Phone className="size-4" /> {candidate.agentPhone} (WhatsApp)
              </a>
            )}
            {candidate.agentEmail && (
              <a href={`mailto:${candidate.agentEmail}`} className="inline-flex items-center gap-2 text-sm text-[#8A6A2E] hover:underline">
                <Mail className="size-4" /> {candidate.agentEmail}
              </a>
            )}
            {!candidate.agentPhone && !candidate.agentEmail && <span className="text-sm text-muted-foreground">Sin contacto</span>}
          </div>
        </Card>
      </div>

      {/* Análisis */}
      <Card className="p-5 space-y-4">
        <h3 className="font-medium text-sm">Análisis (interno)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Valor estimado ({candidate.currency})</Label>
            <Input type="number" step="0.01" value={estimated} onChange={e => setEstimated(e.target.value)} disabled={!canEdit} placeholder="Tu estimación" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Monto ofertado ({candidate.currency})</Label>
            <Input type="number" step="0.01" value={offer} onChange={e => setOffer(e.target.value)} disabled={!canEdit} placeholder="Lo que ofreciste" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Notas de análisis</Label>
          <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} disabled={!canEdit} placeholder="Observaciones, due diligence, decisión…" />
        </div>
        {canEdit && (
          <div className="flex justify-between items-center">
            {canDelete
              ? <Button variant="ghost" size="sm" className="text-destructive" onClick={remove}><Trash2 className="size-3.5 mr-1" />Eliminar</Button>
              : <span />}
            <Button size="sm" onClick={saveAnalysis} disabled={savingAnalysis}>{savingAnalysis ? "Guardando…" : "Guardar análisis"}</Button>
          </div>
        )}
      </Card>
    </div>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  )
}
