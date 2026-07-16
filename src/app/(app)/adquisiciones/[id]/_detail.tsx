"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Phone, Mail, Trash2, MapPin, Calculator, FileText, Pencil, Handshake } from "lucide-react"
import { updateCandidateStage, updateCandidateAnalysis, deleteCandidate, addNegotiation, deleteNegotiation } from "../actions"
import { toVaras2, v2ToM2, convertCurrency, AREA_UNITS, CUERDA_SIZES, formatV2, type AreaUnit } from "@/lib/varas"
import { dealScore, scoreColor, scoreLabel } from "@/lib/deal-score"

interface AutoRef { count: number; avg: number; min: number; max: number; dept: string }
interface Negotiation { id: string; kind: string; amount: number; currency: string; note: string | null; createdAt: string }
const KIND_LABEL: Record<string, string> = { ASKED: "Pidieron", OFFERED: "Ofrecí", COUNTER: "Reofertaron", OTHER: "Otro" }

interface C {
  id: string; stage: string; title: string; propertyType: string | null
  department: string | null; city: string | null; zone: string | null; addressLine: string | null
  cadastralNumber: string | null; hasLocation: boolean
  price: number | null; currency: string; bedrooms: number | null; bathrooms: number | null
  area: number | null; description: string | null; galleryUrls: string[]
  documentUrls: string[]; latitude: number | null; longitude: number | null
  agentName: string | null; agentPhone: string | null; agentEmail: string | null
  analysisNotes: string | null
  areaUnit: string | null; cuerdaVaras: number | null
  refPriceMinV2: number | null; refPriceMaxV2: number | null
  isCommercial: boolean; offerPerV2: number | null
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

export function CandidateDetail({ candidate, canEdit, canDelete, autoRef, fx, negotiations }: { candidate: C; canEdit: boolean; canDelete: boolean; autoRef: AutoRef | null; fx: number; negotiations: Negotiation[] }) {
  const router = useRouter()
  const [stage, setStage] = useState(candidate.stage)
  const [saving, setSaving] = useState(false)
  const [savingAnalysis, setSavingAnalysis] = useState(false)
  const [notes, setNotes] = useState(candidate.analysisNotes ?? "")
  const [areaVal, setAreaVal] = useState(candidate.area?.toString() ?? "")
  const [areaUnit, setAreaUnit] = useState<AreaUnit>((candidate.areaUnit as AreaUnit) ?? "V2")
  const [cuerdaVaras, setCuerdaVaras] = useState(candidate.cuerdaVaras?.toString() ?? "25")
  const [refMin, setRefMin] = useState(candidate.refPriceMinV2?.toString() ?? "")
  const [refMax, setRefMax] = useState(candidate.refPriceMaxV2?.toString() ?? "")
  const [commercial, setCommercial] = useState(candidate.isCommercial)
  const [offerV2, setOfferV2] = useState(candidate.offerPerV2?.toString() ?? "")

  // Cálculos del motor de análisis
  const sym = candidate.currency === "USD" ? "$" : "Q"
  const areaV2 = toVaras2(parseFloat(areaVal), areaUnit, parseInt(cuerdaVaras))
  const pricePerV2 = candidate.price != null && areaV2 ? candidate.price / areaV2 : null
  const refMinN = parseFloat(refMin), refMaxN = parseFloat(refMax)
  const refAvgManual = !isNaN(refMinN) && !isNaN(refMaxN) ? (refMinN + refMaxN) / 2 : null
  const refAvg = refAvgManual ?? autoRef?.avg ?? null // efectiva: manual o automática
  const deviation = pricePerV2 != null && refAvg ? ((pricePerV2 - refAvg) / refAvg) * 100 : null
  const score = dealScore(pricePerV2, refAvg, { isCommercial: commercial, hasLocation: candidate.hasLocation, photos: candidate.galleryUrls.length })
  const suggested = commercial ? (isNaN(refMaxN) ? null : refMaxN) : refAvg
  const offerV2N = parseFloat(offerV2)
  const offerTotal = !isNaN(offerV2N) && areaV2 ? offerV2N * areaV2 : null
  const fmt = (n: number | null, d = 0) => n == null ? "—" : `${sym}${n.toLocaleString("es-GT", { maximumFractionDigits: d })}`

  // Precios en ambas monedas (usa el tipo de cambio configurable)
  const areaM2 = v2ToM2(areaV2)
  const pricePerM2 = candidate.price != null && areaM2 ? candidate.price / areaM2 : null
  const inQ = (n: number | null) => n == null ? null : convertCurrency(n, candidate.currency, "GTQ", fx)
  const inUSD = (n: number | null) => n == null ? null : convertCurrency(n, candidate.currency, "USD", fx)
  const fQ = (n: number | null) => n == null ? "—" : `Q ${n.toLocaleString("es-GT", { maximumFractionDigits: 0 })}`
  const fUSD = (n: number | null) => n == null ? "—" : `$ ${n.toLocaleString("es-GT", { maximumFractionDigits: 0 })}`

  // Negociación
  const [negKind, setNegKind] = useState("ASKED")
  const [negAmount, setNegAmount] = useState("")
  const [negCur, setNegCur] = useState(candidate.currency)
  const [negNote, setNegNote] = useState("")
  const [negBusy, setNegBusy] = useState(false)
  async function addNeg() {
    if (!negAmount.trim()) return
    setNegBusy(true)
    const fd = new FormData()
    fd.set("kind", negKind); fd.set("amount", negAmount); fd.set("currency", negCur); fd.set("note", negNote)
    const res = await addNegotiation(candidate.id, fd)
    setNegBusy(false)
    if ("error" in res) { alert(res.error); return }
    setNegAmount(""); setNegNote(""); router.refresh()
  }
  async function delNeg(negId: string) {
    const res = await deleteNegotiation(negId)
    if ("error" in res) { alert(res.error); return }
    router.refresh()
  }

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
    fd.set("analysisNotes", notes)
    fd.set("area", areaVal); fd.set("areaUnit", areaUnit); fd.set("cuerdaVaras", cuerdaVaras)
    fd.set("refPriceMinV2", refMin); fd.set("refPriceMaxV2", refMax)
    fd.set("isCommercial", String(commercial)); fd.set("offerPerV2", offerV2)
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/adquisiciones" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> Volver a Adquisiciones
        </Link>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link href={`/adquisiciones/${candidate.id}/editar`}
              className="text-sm inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 hover:bg-muted/50">
              <Pencil className="size-4" /> Editar
            </Link>
          )}
          <a href={`/ficha-adquisicion/${candidate.id}`} target="_blank" rel="noopener noreferrer"
            className="text-sm inline-flex items-center gap-1.5 rounded-lg bg-[#12182A] text-[#F4EFE6] px-3 py-2 hover:bg-[#1B2942]">
            <FileText className="size-4" /> Ver ficha / Presentar
          </a>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">{candidate.title}</h1>
          {loc && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="size-3.5" />{loc}</p>}
        </div>
        <div className="text-right">
          <div className="font-display text-2xl text-[#12182A]">{money(candidate.price, candidate.currency)}</div>
          {score != null && (
            <div className="inline-flex items-center gap-1 text-xs font-bold text-white px-2 py-0.5 rounded-full mt-1" style={{ background: scoreColor(score) }}
              title="Deal score (0–100) según precio vs mercado, ubicación y datos">
              Score {score} · {scoreLabel(score)}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">recibida {new Date(candidate.createdAt).toLocaleDateString("es-GT")}</div>
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
            {candidate.cadastralNumber && <Row k="Catastro" v={<span className="font-mono">{candidate.cadastralNumber}</span>} />}
            <Row k="Habitaciones" v={candidate.bedrooms ?? "—"} />
            <Row k="Baños" v={candidate.bathrooms ?? "—"} />
            <Row k="Área" v={areaV2 ? formatV2(areaV2) : (candidate.area ?? "—")} />
            {candidate.addressLine && <Row k="Dirección" v={candidate.addressLine} />}
            {candidate.latitude != null && candidate.longitude != null && (
              <Row k="Ubicación" v={<a href={`https://www.google.com/maps?q=${candidate.latitude},${candidate.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver en Google Maps →</a>} />
            )}
          </dl>
          {candidate.documentUrls.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-1.5">Documentos de municipalidad</div>
              <div className="flex flex-wrap gap-2">
                {candidate.documentUrls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="text-xs bg-muted/40 border rounded-md px-2.5 py-1.5 hover:bg-muted">📄 Documento {i + 1}</a>
                ))}
              </div>
            </div>
          )}
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

      {/* Análisis por vara² */}
      <Card className="p-5 space-y-4">
        <h3 className="font-medium text-sm flex items-center gap-2"><Calculator className="size-4 text-[#8A6A2E]" /> Análisis por vara² (v²)</h3>

        {/* Área + unidad */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Área</Label>
            <Input type="number" step="any" value={areaVal} onChange={e => setAreaVal(e.target.value)} disabled={!canEdit} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Unidad</Label>
            <select value={areaUnit} onChange={e => setAreaUnit(e.target.value as AreaUnit)} disabled={!canEdit}
              className="w-full h-9 border rounded-md px-2 text-sm bg-background disabled:opacity-60">
              {AREA_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          {areaUnit === "CUERDA" && (
            <div className="space-y-1.5">
              <Label className="text-sm">Tamaño cuerda</Label>
              <select value={cuerdaVaras} onChange={e => setCuerdaVaras(e.target.value)} disabled={!canEdit}
                className="w-full h-9 border rounded-md px-2 text-sm bg-background disabled:opacity-60">
                {CUERDA_SIZES.map(cz => <option key={cz.varas} value={cz.varas}>{cz.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Referencia de mercado */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Ref. mercado mín /v² ({candidate.currency})</Label>
            <Input type="number" step="any" value={refMin} onChange={e => setRefMin(e.target.value)} disabled={!canEdit} placeholder="800" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Ref. mercado máx /v² ({candidate.currency})</Label>
            <Input type="number" step="any" value={refMax} onChange={e => setRefMax(e.target.value)} disabled={!canEdit} placeholder="1000" />
          </div>
        </div>

        {/* Referencia automática de tu propia data */}
        {autoRef && (
          <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-2.5 flex items-center justify-between gap-3">
            <span className="text-amber-900">
              📊 Tu inventario en <strong>{autoRef.dept}</strong>: promedio <strong>{fmt(autoRef.avg)}/v²</strong>{" "}
              ({autoRef.count} prop., rango {fmt(autoRef.min)}–{fmt(autoRef.max)})
            </span>
            {canEdit && (
              <Button type="button" size="sm" variant="outline" className="shrink-0"
                onClick={() => { setRefMin(Math.round(autoRef.min).toString()); setRefMax(Math.round(autoRef.max).toString()) }}>
                Usar
              </Button>
            )}
          </div>
        )}

        {/* Resultados */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Área" value={areaV2 ? `${formatV2(areaV2)} · ${Math.round(areaM2!).toLocaleString("es-GT")} m²` : "—"} />
          <Stat label="Ref. promedio /v²" value={fmt(refAvg)} />
          <Stat label="Desviación" value={deviation != null ? `${deviation >= 0 ? "+" : ""}${deviation.toFixed(0)}%` : "—"}
            tone={deviation == null ? undefined : deviation > 5 ? "bad" : deviation < -5 ? "good" : "neutral"} />
        </div>

        {/* Precio por v² y m², en Q y USD (tipo de cambio {fx}) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <PriceCell label="Precio pedido / v²" q={fQ(inQ(pricePerV2))} usd={fUSD(inUSD(pricePerV2))} />
          <PriceCell label="Precio pedido / m²" q={fQ(inQ(pricePerM2))} usd={fUSD(inUSD(pricePerM2))} />
        </div>
        {deviation != null && (
          <p className="text-xs text-muted-foreground">
            {deviation > 5
              ? `Piden ${Math.abs(deviation).toFixed(0)}% por ENCIMA del promedio de mercado.`
              : deviation < -5
                ? `Está ${Math.abs(deviation).toFixed(0)}% por DEBAJO del promedio — posible oportunidad.`
                : "En línea con el promedio de mercado."}
          </p>
        )}

        {/* Comercial + oferta */}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={commercial} onChange={e => setCommercial(e.target.checked)} disabled={!canEdit} className="size-4" />
          Área comercial (frente a carretera / centro → vale más)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-sm">Oferta por v² ({candidate.currency})</Label>
            <div className="flex gap-2">
              <Input type="number" step="any" value={offerV2} onChange={e => setOfferV2(e.target.value)} disabled={!canEdit} placeholder="900" />
              {canEdit && suggested != null && (
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setOfferV2(suggested.toFixed(0))}>
                  Sugerir ({fmt(suggested)})
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Sugerido: {commercial ? "techo de mercado (comercial)" : "promedio de mercado"}.</p>
          </div>
          <div className="text-right bg-[#0D1322] text-[#F4EFE6] rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest text-[#C9A24B]">Oferta total sugerida</div>
            <div className="font-display text-2xl">{offerTotal != null ? fmt(offerTotal) : "—"}</div>
            {candidate.price != null && offerTotal != null && (
              <div className="text-[11px] opacity-75">vs pedido {fmt(candidate.price)} · {(((offerTotal - candidate.price) / candidate.price) * 100).toFixed(0)}%</div>
            )}
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label className="text-sm">Notas de análisis</Label>
          <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} disabled={!canEdit} placeholder="Observaciones, due diligence, decisión…" />
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

      {/* Seguimiento de negociación */}
      <Card className="p-5 space-y-3">
        <h3 className="font-medium text-sm flex items-center gap-2"><Handshake className="size-4 text-[#8A6A2E]" /> Seguimiento de negociación</h3>
        {negotiations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos. Registrá lo que pidieron, lo que ofreciste, las contraofertas…</p>
        ) : (
          <div className="space-y-1.5">
            {negotiations.map(n => (
              <div key={n.id} className="flex items-center justify-between gap-2 text-sm border-l-2 pl-3 py-1"
                style={{ borderColor: n.kind === "ASKED" ? "#A8423F" : n.kind === "OFFERED" ? "#2C6B43" : n.kind === "COUNTER" ? "#C77A1E" : "#6B7280" }}>
                <div>
                  <span className="font-medium">{KIND_LABEL[n.kind] ?? n.kind}:</span>{" "}
                  {n.currency === "USD" ? "$" : "Q"} {n.amount.toLocaleString("es-GT")}
                  {n.note && <span className="text-muted-foreground"> — {n.note}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString("es-GT")}</span>
                  {canEdit && <button onClick={() => delNeg(n.id)} className="text-destructive text-xs">✕</button>}
                </div>
              </div>
            ))}
          </div>
        )}
        {canEdit && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-xs">Movimiento</Label>
              <select value={negKind} onChange={e => setNegKind(e.target.value)} className="w-full h-9 border rounded-md px-2 text-sm bg-background">
                <option value="ASKED">Pidieron</option><option value="OFFERED">Ofrecí</option><option value="COUNTER">Reofertaron</option><option value="OTHER">Otro</option>
              </select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Monto</Label><Input type="number" step="any" value={negAmount} onChange={e => setNegAmount(e.target.value)} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Moneda</Label>
              <select value={negCur} onChange={e => setNegCur(e.target.value)} className="w-full h-9 border rounded-md px-2 text-sm bg-background"><option value="GTQ">Q</option><option value="USD">$</option></select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Nota</Label><Input value={negNote} onChange={e => setNegNote(e.target.value)} placeholder="opcional" /></div>
            <Button size="sm" onClick={addNeg} disabled={negBusy || !negAmount.trim()}>Agregar</Button>
          </div>
        )}
      </Card>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  const cls = tone === "bad" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : "text-[#12182A]"
  return (
    <div className="border rounded-lg p-2.5 text-center bg-muted/20">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-semibold text-sm mt-0.5 ${cls}`}>{value}</div>
    </div>
  )
}

function PriceCell({ label, q, usd }: { label: string; q: string; usd: string }) {
  return (
    <div className="border rounded-lg p-3 bg-muted/20">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-3 mt-1">
        <span className="font-semibold text-[#12182A]">{q}</span>
        <span className="text-sm text-muted-foreground">{usd}</span>
      </div>
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
