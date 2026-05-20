"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { formatGTQ } from "@/lib/format"
import { Plus, Trash2, Phone, Mail, Star, ExternalLink } from "lucide-react"

export interface QuoteVendor {
  id: string
  name: string
  category: string
  contactName: string | null
  phone: string
  email: string | null
  rating: number | null
}

export interface QuoteItemInput {
  description: string
  quantity: number
  unit: string | null
  unitPrice: number
  total: number
}

export interface QuoteFormData {
  vendorId: string
  vendorReference: string | null
  validUntil: string | null
  taxPercent: number
  notes: string | null
  items: QuoteItemInput[]
}

interface Props {
  context: { type: "TICKET" | "PARTIDA"; id: string }
  vendors: QuoteVendor[]
  onSubmit: (data: QuoteFormData) => Promise<{ error?: string; ok?: boolean } | undefined>
  onCancel: () => void
}

const UNITS = ["unidad", "par", "hora", "día", "m²", "m³", "kg", "litro", "global"]

function emptyItem(): QuoteItemInput {
  return { description: "", quantity: 1, unit: "unidad", unitPrice: 0, total: 0 }
}

export function QuoteForm({ context, vendors, onSubmit, onCancel }: Props) {
  const [vendorId, setVendorId] = useState("")
  const [vendorSearch, setVendorSearch] = useState("")
  const [vendorReference, setVendorReference] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [taxPercent, setTaxPercent] = useState(12)
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<QuoteItemInput[]>([emptyItem()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const selectedVendor = vendors.find(v => v.id === vendorId)
  const filteredVendors = vendorSearch
    ? vendors.filter(v =>
        v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        (v.contactName?.toLowerCase().includes(vendorSearch.toLowerCase())) ||
        v.category.toLowerCase().includes(vendorSearch.toLowerCase())
      )
    : vendors

  // Auto-calc each item total
  useEffect(() => {
    setItems(prev => prev.map(i => ({ ...i, total: +(i.quantity * i.unitPrice).toFixed(2) })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateItem(idx: number, patch: Partial<QuoteItemInput>) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const next = { ...it, ...patch }
      next.total = +(next.quantity * next.unitPrice).toFixed(2)
      return next
    }))
  }

  function addItem() { setItems(prev => [...prev, emptyItem()]) }
  function removeItem(idx: number) {
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx))
  }

  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const taxAmount = +(subtotal * (taxPercent / 100)).toFixed(2)
  const total = +(subtotal + taxAmount).toFixed(2)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!vendorId) { setError("Selecciona un proveedor"); return }
    const validItems = items.filter(i => i.description.trim() && i.total > 0)
    if (!validItems.length) { setError("Agregá al menos un rubro con descripción y precio"); return }
    setLoading(true)
    const res = await onSubmit({
      vendorId,
      vendorReference: vendorReference.trim() || null,
      validUntil: validUntil || null,
      taxPercent,
      notes: notes.trim() || null,
      items: validItems,
    })
    setLoading(false)
    if (res?.error) setError(res.error)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Vendor selector */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Proveedor *</Label>
          <Link href="/proveedores/nuevo" target="_blank" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
            + Crear proveedor nuevo <ExternalLink className="size-3" />
          </Link>
        </div>
        {!selectedVendor ? (
          <>
            <Input
              placeholder="Buscar por nombre, contacto o categoría..."
              value={vendorSearch}
              onChange={e => setVendorSearch(e.target.value)}
            />
            <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
              {filteredVendors.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground text-center">Sin proveedores que coincidan.</p>
              ) : filteredVendors.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { setVendorId(v.id); setVendorSearch("") }}
                  className="w-full text-left p-3 hover:bg-muted transition-colors text-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{v.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.category}
                        {v.contactName && ` · ${v.contactName}`}
                      </p>
                    </div>
                    {v.rating != null && (
                      <span className="text-xs flex items-center gap-0.5"><Star className="size-3 fill-amber-400 text-amber-400" />{v.rating.toFixed(1)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="border rounded-md p-3 bg-muted/30 flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <strong className="text-sm">{selectedVendor.name}</strong>
                <span className="text-xs bg-muted text-foreground px-1.5 py-0.5 rounded">{selectedVendor.category}</span>
                {selectedVendor.rating != null && (
                  <span className="text-xs flex items-center gap-0.5"><Star className="size-3 fill-amber-400 text-amber-400" />{selectedVendor.rating.toFixed(1)}</span>
                )}
              </div>
              {selectedVendor.contactName && <p className="text-xs text-muted-foreground">Contacto: {selectedVendor.contactName}</p>}
              <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                <span className="flex items-center gap-1"><Phone className="size-3" />{selectedVendor.phone}</span>
                {selectedVendor.email && <span className="flex items-center gap-1"><Mail className="size-3" />{selectedVendor.email}</span>}
              </div>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setVendorId("")}>Cambiar</Button>
          </div>
        )}
      </Card>

      {/* Quote dates & reference */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Fecha cotización</Label>
          <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} disabled />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Válida hasta</Label>
          <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs"># Cotización proveedor</Label>
          <Input value={vendorReference} onChange={e => setVendorReference(e.target.value)} placeholder="COT-2026-001" />
        </div>
      </div>

      {/* Items table */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Rubros / Detalle *</Label>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus className="size-3 mr-1" /> Agregar rubro
          </Button>
        </div>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
            <div className="col-span-5">Descripción</div>
            <div className="col-span-1 text-right">Cant.</div>
            <div className="col-span-2">Unidad</div>
            <div className="col-span-2 text-right">P. Unit.</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-5"
                placeholder="Ej. Pintura blanca látex 4gal"
                value={it.description}
                onChange={e => updateItem(idx, { description: e.target.value })}
              />
              <Input
                className="col-span-1 text-right"
                type="number"
                min="0"
                step="0.01"
                value={it.quantity || ""}
                onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
              />
              <Select value={it.unit ?? ""} onValueChange={v => updateItem(idx, { unit: v })}>
                <SelectTrigger className="col-span-2"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                className="col-span-2 text-right"
                type="number"
                min="0"
                step="0.01"
                value={it.unitPrice || ""}
                onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
              />
              <div className="col-span-1 text-right tabular-nums text-sm">{formatGTQ(it.total)}</div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={items.length === 1}
                className="col-span-1 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:hover:text-muted-foreground"
                aria-label="Quitar rubro"
              >
                <Trash2 className="size-4 mx-auto" />
              </button>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatGTQ(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">IVA</span>
              <Input
                type="number" min="0" max="100" step="1"
                value={taxPercent}
                onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)}
                className="w-14 h-7 text-center text-xs"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <span className="tabular-nums">{formatGTQ(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-medium pt-1 border-t">
            <span>Total</span>
            <span className="tabular-nums">{formatGTQ(total)}</span>
          </div>
        </div>
      </Card>

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-xs">Notas / términos</Label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Condiciones, garantía, plazos de entrega..." />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : `Guardar cotización (${formatGTQ(total)})`}
        </Button>
      </div>
    </form>
  )
}
