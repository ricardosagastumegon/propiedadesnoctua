"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateTicketStatus } from "../actions"
import { TICKET_STATUSES } from "@/lib/schemas/maintenance"
import { ChevronDown } from "lucide-react"

interface Employee { id: string; name: string }

const TRANSITIONS: Record<string, string[]> = {
  REPORTED: ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["REPORTED"],
}

export function StatusActions({ ticketId, currentStatus, employees }: { ticketId: string; currentStatus: string; employees: Employee[] }) {
  const [open, setOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [assignee, setAssignee] = useState("")
  const [loading, setLoading] = useState(false)

  const transitions = TRANSITIONS[currentStatus] ?? []
  if (transitions.length === 0) return null

  async function applyStatus(status: string) {
    if (status === "ASSIGNED" && employees.length > 0) {
      setPendingStatus(status)
      setOpen(true)
      return
    }
    setLoading(true)
    await updateTicketStatus(ticketId, status)
    setLoading(false)
  }

  async function confirmAssign() {
    setLoading(true)
    await updateTicketStatus(ticketId, "ASSIGNED", assignee || undefined)
    setLoading(false)
    setOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            Cambiar estado <ChevronDown className="size-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Mover a</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {transitions.map(s => (
            <DropdownMenuItem key={s} onClick={() => applyStatus(s)}>
              {TICKET_STATUSES[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar responsable</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Empleado (opcional)</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirmAssign} disabled={loading}>{loading ? "Guardando..." : "Asignar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
