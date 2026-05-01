"use client"
import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { addQuoteItem, deleteQuoteItem } from "../actions"
import { formatGTQ } from "@/lib/format"
import { Plus, Trash2 } from "lucide-react"

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unit: string | null
  unitPrice: number
  total: number
}

export function QuoteItemsSection({ quoteId, items }: { quoteId: string; items: QuoteItem[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(0)
  const ref = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(ref.current!)
    fd.set("quantity", qty.toString())
    fd.set("unitPrice", price.toString())
    await addQuoteItem(quoteId, fd)
    setOpen(false)
    setLoading(false)
    setQty(1)
    setPrice(0)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm">Lineas de cotizacion</h3>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-3 mr-1" />Agregar linea
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sin lineas de detalle.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripcion</TableHead>
              <TableHead>Cant.</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>P. Unitario</TableHead>
              <TableHead>Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="text-sm">{item.description}</TableCell>
                <TableCell className="tabular-nums">{item.quantity}</TableCell>
                <TableCell>{item.unit ?? "—"}</TableCell>
                <TableCell className="tabular-nums">{formatGTQ(item.unitPrice)}</TableCell>
                <TableCell className="tabular-nums font-medium">{formatGTQ(item.total)}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="size-7"
                    onClick={() => deleteQuoteItem(item.id, quoteId)}>
                    <Trash2 className="size-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar linea</DialogTitle></DialogHeader>
          <form ref={ref} onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Descripcion *</Label>
              <Input name="description" placeholder="Ej. Mano de obra instalacion" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Cantidad</Label>
                <Input type="number" min="0.01" step="0.01" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 1)} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidad</Label>
                <Input name="unit" placeholder="m2, hr, und..." />
              </div>
              <div className="space-y-1.5">
                <Label>P. Unitario (Q)</Label>
                <Input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Total: {formatGTQ(qty * price)}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Agregar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
