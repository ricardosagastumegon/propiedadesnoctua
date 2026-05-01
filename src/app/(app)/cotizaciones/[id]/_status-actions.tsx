"use client"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { updateQuoteStatus } from "../actions"
import { ChevronDown } from "lucide-react"
import { useState } from "react"

export function QuoteStatusActions({ quoteId, currentStatus }: { quoteId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false)

  if (currentStatus === "APPROVED" || currentStatus === "REJECTED") return null

  async function change(status: string) {
    setLoading(true)
    await updateQuoteStatus(quoteId, status)
    setLoading(false)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          Cambiar estado <ChevronDown className="size-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {currentStatus !== "APPROVED" && <DropdownMenuItem onClick={() => change("APPROVED")}>Aprobar</DropdownMenuItem>}
        {currentStatus !== "REJECTED" && <DropdownMenuItem onClick={() => change("REJECTED")}>Rechazar</DropdownMenuItem>}
        {currentStatus !== "EXPIRED" && <DropdownMenuItem onClick={() => change("EXPIRED")}>Marcar vencida</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
