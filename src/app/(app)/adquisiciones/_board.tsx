"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, MapPin, TrendingUp, Tag, Users } from "lucide-react"
import { scoreColor, scoreLabel } from "@/lib/deal-score"
import { categoryLabel } from "@/lib/acquisition-categories"

export interface BoardItem {
  id: string
  title: string
  stage: string
  price: number | null
  currency: string
  department: string | null
  city: string | null
  zone: string | null
  cover: string | null
  linkName: string | null
  mirrored: boolean
  score: number | null
  categories: string[]
  origin: string
}

const STAGES = [
  { key: "NEW", label: "Nuevas", cls: "bg-blue-100 text-blue-800" },
  { key: "OFFERED", label: "Ofertadas", cls: "bg-amber-100 text-amber-800" },
  { key: "ACCEPTED", label: "Aceptadas", cls: "bg-emerald-100 text-emerald-800" },
  { key: "DISCARDED", label: "Descartadas", cls: "bg-gray-100 text-gray-600" },
] as const

function money(n: number | null, c: string) {
  if (n == null) return "—"
  return `${c === "USD" ? "$" : "Q"} ${n.toLocaleString("es-GT", { minimumFractionDigits: 0 })}`
}

export function Board({ items }: { items: BoardItem[] }) {
  const [dept, setDept] = useState<string>("")
  const [cat, setCat] = useState<string>("")
  const [origin, setOrigin] = useState<string>("")
  const [q, setQ] = useState("")
  const [byScore, setByScore] = useState(false)

  const departments = useMemo(
    () => Array.from(new Set(items.map(i => i.department).filter(Boolean))).sort() as string[],
    [items],
  )

  // Etiquetas presentes (con conteo), para los chips de filtro.
  const catCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of items) for (const c of i.categories) m.set(c, (m.get(c) ?? 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [items])

  // Orígenes presentes (quién cargó), para el selector.
  const origins = useMemo(
    () => Array.from(new Set(items.map(i => i.origin))).sort(),
    [items],
  )

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    const list = items.filter(i =>
      (!dept || i.department === dept) &&
      (!cat || i.categories.includes(cat)) &&
      (!origin || i.origin === origin) &&
      (!query || i.title.toLowerCase().includes(query) || (i.zone ?? "").toLowerCase().includes(query) || (i.city ?? "").toLowerCase().includes(query)),
    )
    if (byScore) list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    return list
  }, [items, dept, cat, origin, q, byScore])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="space-y-2">
        {/* Departamentos */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setDept("")}
            className={`text-xs px-3 py-1.5 rounded-full border ${dept === "" ? "bg-[#12182A] text-[#F4EFE6] border-[#12182A]" : "hover:bg-muted/50"}`}
          >Todos ({items.length})</button>
          {departments.map(d => {
            const n = items.filter(i => i.department === d).length
            return (
              <button key={d} onClick={() => setDept(dept === d ? "" : d)}
                className={`text-xs px-3 py-1.5 rounded-full border ${dept === d ? "bg-[#12182A] text-[#F4EFE6] border-[#12182A]" : "hover:bg-muted/50"}`}
              >{d} ({n})</button>
            )
          })}
        </div>

        {/* Etiquetas (categorías) */}
        {catCounts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Tag className="size-3.5" /> Etiqueta:</span>
            {catCounts.map(([value, n]) => (
              <button key={value} onClick={() => setCat(cat === value ? "" : value)}
                className={`text-xs px-3 py-1.5 rounded-full border ${cat === value ? "bg-[#8A6A2E] text-white border-[#8A6A2E]" : "hover:bg-muted/50"}`}
              >{categoryLabel(value)} ({n})</button>
            ))}
            {cat && <button onClick={() => setCat("")} className="text-xs text-muted-foreground underline">limpiar</button>}
          </div>
        )}

        {/* Buscar + origen + orden */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative max-w-xs flex-1">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por título, zona…" className="pl-8 h-9" />
          </div>
          {origins.length > 1 && (
            <label className="inline-flex items-center gap-1.5 text-xs">
              <Users className="size-3.5 text-muted-foreground" />
              <select value={origin} onChange={e => setOrigin(e.target.value)}
                className="h-9 border rounded-lg px-2 text-xs bg-background max-w-[180px]">
                <option value="">Todos los orígenes</option>
                {origins.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          )}
          <button onClick={() => setByScore(v => !v)}
            className={`text-xs px-3 py-2 rounded-lg border inline-flex items-center gap-1.5 ${byScore ? "bg-[#12182A] text-[#F4EFE6] border-[#12182A]" : "hover:bg-muted/50"}`}>
            <TrendingUp className="size-3.5" /> Ordenar por oportunidad
          </button>
        </div>
      </div>

      {/* Tablero por etapa */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {STAGES.map(stage => {
          const col = filtered.filter(c => c.stage === stage.key)
          return (
            <div key={stage.key} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.cls}`}>{stage.label}</span>
                <span className="text-xs text-muted-foreground">{col.length}</span>
              </div>
              {col.map(c => (
                <Link key={c.id} href={`/adquisiciones/${c.id}`}>
                  <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer overflow-hidden relative">
                    {c.score != null && (
                      <span className="absolute top-2 right-2 z-10 text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 shadow"
                        style={{ background: scoreColor(c.score) }} title={`Deal score: ${scoreLabel(c.score)}`}>
                        {c.score}
                      </span>
                    )}
                    {c.cover && <img src={c.cover} alt="" className="w-full h-24 object-cover rounded-md mb-2" />}
                    <div className="font-medium text-sm line-clamp-2 pr-8">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      {[c.zone, c.city, c.department].filter(Boolean).join(", ") || "Sin ubicación"}
                    </div>
                    {c.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.categories.slice(0, 3).map(cat => (
                          <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#8A6A2E]/10 text-[#8A6A2E] border border-[#8A6A2E]/20">
                            {categoryLabel(cat)}
                          </span>
                        ))}
                        {c.categories.length > 3 && <span className="text-[10px] text-muted-foreground">+{c.categories.length - 3}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <span className="text-sm font-semibold text-[#12182A]">{money(c.price, c.currency)}</span>
                      {c.mirrored
                        ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">solo lectura</span>
                        : <span className="text-[10px] text-muted-foreground truncate max-w-[110px]" title={c.origin}>{c.origin}</span>}
                    </div>
                  </Card>
                </Link>
              ))}
              {col.length === 0 && <div className="text-xs text-muted-foreground/60 px-1 py-3">—</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
