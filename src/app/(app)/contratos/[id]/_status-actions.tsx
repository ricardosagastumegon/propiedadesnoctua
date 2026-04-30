"use client"
import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { updateContractStatus } from "../actions"

export function ContractStatusActions({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition()

  function change(status: string) {
    startTransition(async () => {
      await updateContractStatus(id, status)
      toast.success("Estado actualizado.")
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          Cambiar estado <ChevronDown className="size-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {currentStatus !== "ACTIVE" && <DropdownMenuItem onClick={() => change("ACTIVE")}>Activar</DropdownMenuItem>}
        {currentStatus !== "DRAFT" && <DropdownMenuItem onClick={() => change("DRAFT")}>Pasar a borrador</DropdownMenuItem>}
        {currentStatus !== "TERMINATED" && <DropdownMenuItem onClick={() => change("TERMINATED")} className="text-destructive">Terminar contrato</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
